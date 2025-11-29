// routing.js
// Path finding, transfers, walking route fetch, helpers
// Now crowd-aware: prefers less crowded routes during peak hours
// Exposes globally: findNearestStation, findPathBetweenStations, findTransferPoint, fetchWalkingRoute, resolveQueryToNearestStation, calculateFare

(function () {
  var stationGraph = new Map();
  var stationIndex = new Map();

  // Check if it's peak hour
  function isPeakHour() {
    var hour = new Date().getHours();
    var peakHours = [[8, 10], [17, 19]];
    for (var i = 0; i < peakHours.length; i++) {
      if (hour >= peakHours[i][0] && hour <= peakHours[i][1]) {
        return true;
      }
    }
    return false;
  }

  // Calculate cost of traversing between two stations
  // Lower cost = better route
  function calculateEdgeCost(fromStation, toStation) {
    var baseCost = 1.0;
    
    // During peak hours, add crowd penalty
    if (isPeakHour()) {
      var crowdPenalty = (toStation.crowd || 0) * 2.0; // Scale crowd 0-1 to 0-2 penalty
      return baseCost + crowdPenalty;
    }
    
    return baseCost;
  }

  // Haversine (meters)
  function distance(lat1, lng1, lat2, lng2) {
    var R = 6371e3;
    var φ1 = (lat1 * Math.PI) / 180;
    var φ2 = (lat2 * Math.PI) / 180;
    var Δφ = ((lat2 - lat1) * Math.PI) / 180;
    var Δλ = ((lng2 - lng1) * Math.PI) / 180;
    var a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function findNearestStation(lat, lng) {
    if (!window.stations || window.stations.length === 0) return null;
    var nearest = null;
    var minDist = Infinity;
    window.stations.forEach(function (station) {
      var dist = distance(lat, lng, station.lat, station.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = station;
      }
    });
    return nearest;
  }
  window.findNearestStation = findNearestStation;
  window.distance = distance;

  function addGraphEdge(id1, id2) {
    if (!id1 || !id2 || id1 === id2) return;
    if (!stationGraph.has(id1)) stationGraph.set(id1, new Set());
    if (!stationGraph.has(id2)) stationGraph.set(id2, new Set());
    stationGraph.get(id1).add(id2);
    stationGraph.get(id2).add(id1);
  }

  function buildStationGraph(stationList) {
    stationGraph = new Map();
    stationIndex = new Map();
    if (!stationList || !stationList.length) return;

    stationList.forEach(function (station) {
      stationIndex.set(station.id, station);
    });

    var byRoute = {};
    stationList.forEach(function (station) {
      if (!byRoute[station.route_id]) byRoute[station.route_id] = [];
      byRoute[station.route_id].push(station);
    });

    Object.keys(byRoute).forEach(function (routeId) {
      var routeStations = byRoute[routeId];
      routeStations.sort(function (a, b) {
        var ma = a.id && a.id.match(/\d+/);
        var mb = b.id && b.id.match(/\d+/);
        var numA = ma ? parseInt(ma[0], 10) : NaN;
        var numB = mb ? parseInt(mb[0], 10) : NaN;
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.id.localeCompare(b.id);
      });
      for (var i = 0; i < routeStations.length - 1; i++) {
        addGraphEdge(routeStations[i].id, routeStations[i + 1].id);
      }
    });

    for (var i = 0; i < stationList.length; i++) {
      for (var j = i + 1; j < stationList.length; j++) {
        var s1 = stationList[i];
        var s2 = stationList[j];
        if (!s1 || !s2 || s1.route_id === s2.route_id) continue;

        var name1 = (s1.name || "").toUpperCase().trim();
        var name2 = (s2.name || "").toUpperCase().trim();
        var sameName = name1 !== "" && name1 === name2;
        var close = distance(s1.lat, s1.lng, s2.lat, s2.lng) < 250;

        if (sameName || close) {
          addGraphEdge(s1.id, s2.id);
        }
      }
    }

    window.stationGraph = stationGraph;
    window.stationIndex = stationIndex;
  }
  window.buildStationGraph = buildStationGraph;

  // Dijkstra's algorithm - finds least-cost path (crowd-aware)
  function findPathBetweenStations(startStation, destStation) {
    if (!startStation || !destStation) return null;

    if ((!stationGraph || stationGraph.size === 0) && window.stations) {
      buildStationGraph(window.stations);
    }

    if (
      !stationGraph.has(startStation.id) ||
      !stationGraph.has(destStation.id)
    ) {
      return null;
    }

    if (startStation.id === destStation.id) return [startStation];

    // Dijkstra's algorithm with crowd-aware costs
    var distances = {};
    var previous = {};
    var unvisited = new Set();

    window.stations.forEach(function (station) {
      distances[station.id] = Infinity;
      previous[station.id] = null;
      unvisited.add(station.id);
    });

    distances[startStation.id] = 0;

    while (unvisited.size > 0) {
      // Find unvisited node with smallest distance
      var currentId = null;
      var minDist = Infinity;
      unvisited.forEach(function (id) {
        if (distances[id] < minDist) {
          minDist = distances[id];
          currentId = id;
        }
      });

      if (currentId === null || minDist === Infinity) break;
      if (currentId === destStation.id) break;

      unvisited.delete(currentId);
      var neighbors = stationGraph.get(currentId);
      if (!neighbors) continue;

      neighbors.forEach(function (neighborId) {
        if (!unvisited.has(neighborId)) return;

        var neighbor = stationIndex.get(neighborId);
        if (!neighbor) return;

        // Calculate cost to move to neighbor
        var current = stationIndex.get(currentId);
        var edgeCost = calculateEdgeCost(current, neighbor);
        var altDistance = distances[currentId] + edgeCost;

        if (altDistance < distances[neighborId]) {
          distances[neighborId] = altDistance;
          previous[neighborId] = currentId;
        }
      });
    }

    // Reconstruct path
    var path = [];
    var currentId = destStation.id;
    while (currentId !== null) {
      path.unshift(stationIndex.get(currentId));
      currentId = previous[currentId];
    }

    if (path.length === 0 || path[0].id !== startStation.id) {
      return null;
    }

    return path;
  }
  window.findPathBetweenStations = findPathBetweenStations;

  function findTransferPoint(station1, station2) {
    var route1Stations = window.stations.filter(function (s) {
      return s.route_id === station1.route_id;
    });
    var route2Stations = window.stations.filter(function (s) {
      return s.route_id === station2.route_id;
    });

    for (var i = 0; i < route1Stations.length; i++) {
      for (var j = 0; j < route2Stations.length; j++) {
        var name1 = (route1Stations[i].name || "")
          .toUpperCase()
          .trim()
          .replace(/\s+/g, " ");
        var name2 = (route2Stations[j].name || "")
          .toUpperCase()
          .trim()
          .replace(/\s+/g, " ");
        if (name1 === name2 && name1 !== "")
          return [route1Stations[i], route2Stations[j]];
      }
    }

    var bestMatch = null;
    var bestDist = Infinity;
    for (var i = 0; i < route1Stations.length; i++) {
      for (var j = 0; j < route2Stations.length; j++) {
        var dist = distance(
          route1Stations[i].lat,
          route1Stations[i].lng,
          route2Stations[j].lat,
          route2Stations[j].lng
        );
        if (dist < 500 && dist < bestDist) {
          bestDist = dist;
          bestMatch = [route1Stations[i], route2Stations[j]];
        }
      }
    }

    if (bestMatch) {
      console.log(
        "Found transfer point:",
        bestMatch[0].name,
        "->",
        bestMatch[1].name,
        "distance:",
        bestDist.toFixed(0),
        "m"
      );
      return bestMatch;
    }

    console.log(
      "No transfer point found between",
      station1.route_id,
      "and",
      station2.route_id
    );
    return null;
  }
  window.findTransferPoint = findTransferPoint;

  function fetchWalkingRoute(start, dest) {
    var url =
      "https://router.project-osrm.org/route/v1/walking/" +
      start.lng +
      "," +
      start.lat +
      ";" +
      dest.lng +
      "," +
      dest.lat +
      "?overview=full&geometries=geojson";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("OSRM failed");
        return res.json();
      })
      .then(function (data) {
        if (data.code !== "Ok" || !data.routes || !data.routes.length)
          throw new Error("No route found");
        return data.routes[0].geometry;
      });
  }
  window.fetchWalkingRoute = fetchWalkingRoute;

  // Convenience: resolveQueryToNearestStation(query, geocodeAsync)
  // geocodeAsync should be a function(query) -> Promise<{lat,lng,name,station?}|null>
  window.resolveQueryToNearestStation = async function (query, geocodeAsync) {
    try {
      if (!query) return null;

      // 1. try station match directly
      if (typeof window.findStationByName === "function") {
        var st = window.findStationByName(query);
        if (st)
          return {
            station: st,
            source: "station",
            coords: { lat: st.lat, lng: st.lng },
          };
      }

      // 2. if coords provided
      var coordMatch = query
        .trim()
        .match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
      if (coordMatch) {
        var lat = parseFloat(coordMatch[1]);
        var lng = parseFloat(coordMatch[3]);
        var nearest = findNearestStation(lat, lng);
        if (nearest)
          return {
            station: nearest,
            source: "coords",
            coords: { lat: lat, lng: lng },
          };
        return {
          station: null,
          source: "coords",
          coords: { lat: lat, lng: lng },
        };
      }

      // 3. fallback to geocodeAsync if provided
      if (typeof geocodeAsync === "function") {
        var res = await geocodeAsync(query);
        if (!res) return null;
        var lat = res.lat || res.latitude || (res.location && res.location.lat);
        var lng = res.lng || res.lon || (res.location && res.location.lng);
        if (typeof lat === "undefined" || typeof lng === "undefined") {
          if (res && res.lat && res.lon) {
            lat = parseFloat(res.lat);
            lng = parseFloat(res.lon);
          }
        }
        if (typeof lat === "undefined" || typeof lng === "undefined")
          return null;
        var nearest = findNearestStation(parseFloat(lat), parseFloat(lng));
        if (nearest)
          return {
            station: nearest,
            source: "geocode",
            coords: { lat: parseFloat(lat), lng: parseFloat(lng) },
          };
        return {
          station: null,
          source: "geocode",
          coords: { lat: parseFloat(lat), lng: parseFloat(lng) },
        };
      }

      return null;
    } catch (err) {
      console.error("resolveQueryToNearestStation error", err);
      return null;
    }
  };

  // --- FARE CALCULATION LOGIC (UPDATED) ---

  // Fare configuration based on your rules
  var FARE_CONFIG = {
    // Flat fare per station for all transit types
    'TRANSIT_PER_STATION': 0.30,
    // Grab fare components
    'GRAB': {
      baseFare: 2.00,         // Assumed base fare
      perKmRate: 0.65,        // Assumed rate per km
      perMinuteRate: 0.30,    // Assumed rate per minute of travel
      bookingFee: 1.00,       // Assumed fixed booking fee
      surgeMultiplier: 1.0     // Default surge, can be changed later
    }
  };

  // Main fare calculation function (Updated)
  window.calculateFare = function(path, startWalkDist, destWalkDist) {
    var breakdown = {
      total: 0,
      transit: 0,
      startTransport: 0,
      endTransport: 0,
      startType: 'Walk',
      endType: 'Walk'
    };

    // --- Calculate Grab fare for the start of the journey ---
    if (startWalkDist > 300) {
      var distKm = startWalkDist / 1000;
      // Assume average speed of 30 km/h in traffic to estimate time
      var estimatedMinutes = (distKm / 30) * 60; 
      
      var grab = FARE_CONFIG.GRAB;
      breakdown.startTransport = (grab.baseFare + (distKm * grab.perKmRate) + (estimatedMinutes * grab.perMinuteRate) + grab.bookingFee) * grab.surgeMultiplier;
      breakdown.startType = 'Grab';
    }

    // --- Calculate Transit fare ---
    if (path && path.length > 1) {
      // The number of stops is the number of stations in the path minus 1
      var stops = path.length - 1;
      breakdown.transit = stops * FARE_CONFIG.TRANSIT_PER_STATION;
    }

    // --- Calculate Grab fare for the end of the journey ---
    if (destWalkDist > 300) {
      var distKm = destWalkDist / 1000;
      var estimatedMinutes = (distKm / 30) * 60;

      var grab = FARE_CONFIG.GRAB;
      breakdown.endTransport = (grab.baseFare + (distKm * grab.perKmRate) + (estimatedMinutes * grab.perMinuteRate) + grab.bookingFee) * grab.surgeMultiplier;
      breakdown.endType = 'Grab';
    }

    // --- Calculate total ---
    breakdown.total = breakdown.transit + breakdown.startTransport + breakdown.endTransport;
    
    // Round to 2 decimal places
    breakdown.total = Math.round(breakdown.total * 100) / 100;
    breakdown.startTransport = Math.round(breakdown.startTransport * 100) / 100;
    breakdown.endTransport = Math.round(breakdown.endTransport * 100) / 100;
    breakdown.transit = Math.round(breakdown.transit * 100) / 100;

    return breakdown;
  };
})();