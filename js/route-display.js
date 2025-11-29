// route-display.js (SIMPLIFIED)
// visualization helpers: drawPublicTransportRoute(start,dest,startStation,destStation,path)

(function () {
  var WALK_THRESHOLD = 300; // meters
  
  function getRouteColor(routeId) {
    if (window.getRouteColor) return window.getRouteColor(routeId);
    return "#54c1ff";
  }

  // Create Grab icon marker (small, always visible)
  function createGrabIconMarker() {
    return L.divIcon({
      className: 'grab-icon-marker',
      html: '<div class="grab-icon-circle">🚗</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  // Create Transit line icon marker
  function createTransitIconMarker(routeId) {
    var routeNames = {
      'AG': 'LRT Ampang',
      'PH': 'LRT Putra Heights',
      'KJ': 'LRT Kelana Jaya',
      'MR': 'Monorail',
      'MRT': 'MRT Kajang',
      'PYL': 'MRT Putrajaya',
      'BRT': 'BRT Sunway'
    };
    
    return L.divIcon({
      className: 'transit-icon-marker',
      html: '<div class="transit-icon-circle" data-route="' + routeId + '">🚇</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  // Create Transit line card
  function createTransitCard(routeId, stationCount) {
    var routeNames = {
      'AG': 'LRT Ampang Line',
      'PH': 'LRT Putra Heights Line',
      'KJ': 'LRT Kelana Jaya Line',
      'MR': 'Monorail',
      'MRT': 'MRT Kajang Line',
      'PYL': 'MRT Putrajaya Line',
      'BRT': 'BRT Sunway Line'
    };
    
    var estimatedTime = (stationCount - 1) * 3; // 3 min per stop
    
    return '<div class="transit-card-content">' +
              '<div class="transit-card-header">' +
                '<span class="transit-icon">🚇</span>' +
                '<span class="transit-title">' + (routeNames[routeId] || routeId) + '</span>' +
              '</div>' +
              '<div class="transit-card-body">' +
                '<div class="transit-stat">' +
                  '<span class="transit-label">Stops</span>' +
                  '<span class="transit-value">' + (stationCount - 1) + ' stops</span>' +
                '</div>' +
                '<div class="transit-stat">' +
                  '<span class="transit-label">Est. Time</span>' +
                  '<span class="transit-value">~' + estimatedTime + ' min</span>' +
                '</div>' +
              '</div>' +
            '</div>';
  }

  // Create Walking icon marker
  function createWalkingIconMarker() {
    return L.divIcon({
      className: 'walking-icon-marker',
      html: '<div class="walking-icon-circle">🚶</div>',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  // Create Grab info card popup (shows on hover)
  function createGrabCard(from, to, distanceMeters) {
    var distKm = (distanceMeters / 1000).toFixed(2);
    var estimatedTime = Math.ceil(distanceMeters / 500 * 3); // ~30km/h avg in traffic
    
    console.log("[Grab Card] Creating card:", distKm + "km,", estimatedTime + "min");
    
    return '<div class="grab-card-content">' +
              '<div class="grab-card-header">' +
                '<span class="grab-icon">🚗</span>' +
                '<span class="grab-title">Book a Grab</span>' +
              '</div>' +
              '<div class="grab-card-body">' +
                '<div class="grab-stat">' +
                  '<span class="grab-label">Distance</span>' +
                  '<span class="grab-value">' + distKm + ' km</span>' +
                '</div>' +
                '<div class="grab-stat">' +
                  '<span class="grab-label">Est. Time</span>' +
                  '<span class="grab-value">~' + estimatedTime + ' min</span>' +
                '</div>' +
              '</div>' +
            '</div>';
  }

  // Create Walking info card
  function createWalkingCard(from, to, distanceMeters) {
    var distKm = (distanceMeters / 1000).toFixed(2);
    var estimatedTime = Math.ceil(distanceMeters / 80); // ~5km/h walking speed
    
    return '<div class="walking-card-content">' +
              '<div class="walking-card-header">' +
                '<span class="walking-icon">🚶</span>' +
                '<span class="walking-title">Walking Route</span>' +
              '</div>' +
              '<div class="walking-card-body">' +
                '<div class="walking-stat">' +
                  '<span class="walking-label">Distance</span>' +
                  '<span class="walking-value">' + distKm + ' km</span>' +
                '</div>' +
                '<div class="walking-stat">' +
                  '<span class="walking-label">Est. Time</span>' +
                  '<span class="walking-value">~' + estimatedTime + ' min</span>' +
                '</div>' +
              '</div>' +
            '</div>';
  }

  window.drawPublicTransportRoute = function (
    start,
    dest,
    startStation,
    destStation,
    path
  ) {
    console.log("[Route Display] Drawing route from", start.name, "to", dest.name);
    
    if (window.startMarker) window.startMarker.remove();
    if (window.destMarker) window.destMarker.remove();
    if (window.routeLayer) window.routeLayer.remove();
    if (!window.stationMarkers) window.stationMarkers = [];
    if (!window.routeLayers) window.routeLayers = [];
    if (!window.grabLayers) window.grabLayers = [];

    window.stationMarkers.forEach(function (m) { m.remove(); });
    window.routeLayers.forEach(function (l) { l.remove(); });
    window.grabLayers.forEach(function (l) { l.remove(); });
    window.stationMarkers = [];
    window.routeLayers = [];
    window.grabLayers = [];

    // Use globally defined icons from map-init.js
    window.startMarker = L.marker([start.lat, start.lng], {
      icon: window.startIcon,
      interactive: false,
      zIndexOffset: 1000
    })
      .addTo(map)
      .bindPopup("Start: " + (start.name || ""));

    window.destMarker = L.marker([dest.lat, dest.lng], {
      icon: window.destIcon,
      interactive: false,
      zIndexOffset: 1000
    })
      .addTo(map)
      .bindPopup("Destination: " + (dest.name || ""));

    var startDist = window.distance(start.lat, start.lng, startStation.lat, startStation.lng);
    var destDist = window.distance(dest.lat, dest.lng, destStation.lat, destStation.lng);

    console.log("[Route Display] Start walk:", startDist.toFixed(0) + "m, Dest walk:", destDist.toFixed(0) + "m");

    // Draw START segment
    if (startDist > 50) {
      if (startDist > WALK_THRESHOLD) {
        // GRAB route (orange solid line following roads)
        console.log("[Route Display] Drawing GRAB for START");
        
        window.fetchWalkingRoute(start, { lat: startStation.lat, lng: startStation.lng })
          .then(function (walkingGeom) {
            // Draw glow layer
            var grabGlowLayer = L.geoJSON(walkingGeom, {
              style: { color: "rgba(255, 107, 53, 0.4)", weight: 12, opacity: 0.6, lineCap: "round", lineJoin: "round" }
            }).addTo(map);
            window.grabLayers.push(grabGlowLayer);
            
            // Draw main line
            var grabLayer = L.geoJSON(walkingGeom, {
              style: { color: "#FF6B35", weight: 6, opacity: 0.95, lineCap: "round", lineJoin: "round" }
            }).addTo(map);
            window.grabLayers.push(grabLayer);
            
            // Add Grab icon marker at midpoint of route
            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];
            
            var grabMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createGrabIconMarker(),
              interactive: true,
              zIndexOffset: 2000
            }).addTo(map);
            
            // Bind popup with card content
            grabMarker.bindPopup(createGrabCard(start.name, startStation.name, startDist), {
              className: 'grab-card-popup',
              closeButton: false,
              autoClose: false,
              closeOnClick: false
            });
            
            // Show popup on hover
            grabMarker.on('mouseover', function() {
              this.openPopup();
            });
            grabMarker.on('mouseout', function() {
              this.closePopup();
            });
            
            window.grabLayers.push(grabMarker);
            
            console.log("[Route Display] Grab route START drawn");
          })
          .catch(function (err) {
            console.warn("[Route Display] Grab route START failed:", err);
          });
      } else {
        // WALKING route (blue dotted line)
        console.log("[Route Display] Drawing WALKING for START");
        window.fetchWalkingRoute(start, { lat: startStation.lat, lng: startStation.lng })
          .then(function (walkingGeom) {
            var walkingLayer = L.geoJSON(walkingGeom, {
              style: { color: "#54c1ff", weight: 6, opacity: 0.9, dashArray: "2,8" }
            }).addTo(map);
            window.routeLayers.push(walkingLayer);
            
            // Add walking icon marker at midpoint
            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];
            
            var walkingMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createWalkingIconMarker(),
              interactive: true,
              zIndexOffset: 2000
            }).addTo(map);
            
            // Bind popup with card content
            walkingMarker.bindPopup(createWalkingCard(start.name, startStation.name, startDist), {
              className: 'walking-card-popup',
              closeButton: false,
              autoClose: false,
              closeOnClick: false
            });
            
            // Show popup on hover
            walkingMarker.on('mouseover', function() {
              this.openPopup();
            });
            walkingMarker.on('mouseout', function() {
              this.closePopup();
            });
            
            window.routeLayers.push(walkingMarker);
          })
          .catch(function (err) {
            console.warn("[Route Display] Walking route START failed:", err);
          });
      }
    }

    // Draw TRANSIT path
    if (path && path.length > 1) {
      console.log("[Route Display] Drawing transit path with", path.length, "stations");
      var seenStations = new Set();
      var routeSegments = {}; // Group consecutive stations by route

      // Group consecutive stations by route
      var currentRoute = path[0].route_id;
      var currentSegment = [path[0]];
      
      for (var i = 1; i < path.length; i++) {
        if (path[i].route_id === currentRoute) {
          currentSegment.push(path[i]);
        } else {
          // Save current segment
          if (!routeSegments[currentRoute]) routeSegments[currentRoute] = [];
          routeSegments[currentRoute].push(currentSegment);
          
          // Start new segment
          currentRoute = path[i].route_id;
          currentSegment = [path[i]];
        }
      }
      // Save last segment
      if (!routeSegments[currentRoute]) routeSegments[currentRoute] = [];
      routeSegments[currentRoute].push(currentSegment);

      // Draw lines and add transit icons for each route segment
      for (var i = 0; i < path.length - 1; i++) {
        var s1 = path[i];
        var s2 = path[i + 1];
        var routeColor = getRouteColor(s1.route_id);

        var glowLine = L.polyline(
          [[s1.lat, s1.lng], [s2.lat, s2.lng]],
          { color: "rgba(255,255,255,0.3)", weight: 11, opacity: 0.55, lineCap: "round", lineJoin: "round" }
        ).addTo(map);
        window.routeLayers.push(glowLine);

        var transitLine = L.polyline(
          [[s1.lat, s1.lng], [s2.lat, s2.lng]],
          { color: routeColor, weight: 6, opacity: 0.95, lineCap: "round", lineJoin: "round" }
        ).addTo(map);
        window.routeLayers.push(transitLine);

        if (!seenStations.has(s1.id)) {
          var marker = L.circleMarker([s1.lat, s1.lng], {
            radius: 10,
            color: "#050916",
            fillColor: routeColor,
            fillOpacity: 1,
            weight: 3,
            className: "route-station",
          })
            .addTo(map)
            .bindPopup(
              '<div class="station-card-content">' +
                '<div class="station-card-header">' +
                  '<span class="station-icon">🚉</span>' +
                  '<span class="station-name">' + s1.name + '</span>' +
                '</div>' +
                '<div class="station-card-body">' +
                  '<div class="station-stat">' +
                    '<span class="station-label">Crowd Level</span>' +
                    '<span class="station-value">' + ((s1.crowd || 0) * 100).toFixed(1) + '%</span>' +
                  '</div>' +
                  '<div class="station-stat">' +
                    '<span class="station-label">Line</span>' +
                    '<span class="station-value">' + s1.route_id + '</span>' +
                  '</div>' +
                '</div>' +
              '</div>',
              {
                className: 'station-card-popup',
                closeButton: false,
                autoClose: false,
                closeOnClick: false
              }
            );
          
          // Show popup on hover
          marker.on('mouseover', function() {
            this.openPopup();
          });
          marker.on('mouseout', function() {
            this.closePopup();
          });
          
          window.stationMarkers.push(marker);
          seenStations.add(s1.id);
        }
      }

      // Add transit line icons for each route segment
      Object.keys(routeSegments).forEach(function(routeId) {
        routeSegments[routeId].forEach(function(segment) {
          if (segment.length > 1) {
            // Calculate midpoint of segment
            var midIdx = Math.floor(segment.length / 2);
            var midStation = segment[midIdx];
            
            var transitMarker = L.marker([midStation.lat, midStation.lng], {
              icon: createTransitIconMarker(routeId),
              interactive: true,
              zIndexOffset: 1500
            }).addTo(map);
            
            // Bind popup with transit card
            transitMarker.bindPopup(createTransitCard(routeId, segment.length), {
              className: 'transit-card-popup',
              closeButton: false,
              autoClose: false,
              closeOnClick: false
            });
            
            // Show popup on hover
            transitMarker.on('mouseover', function() {
              this.openPopup();
            });
            transitMarker.on('mouseout', function() {
              this.closePopup();
            });
            
            window.routeLayers.push(transitMarker);
          }
        });
      });

      var lastStation = path[path.length - 1];
      if (!seenStations.has(lastStation.id)) {
        var marker = L.circleMarker([lastStation.lat, lastStation.lng], {
          radius: 10,
          color: "#050916",
          fillColor: getRouteColor(lastStation.route_id),
          fillOpacity: 1,
          weight: 3,
          className: "route-station",
        })
          .addTo(map)
          .bindPopup(
            '<div class="station-card-content">' +
              '<div class="station-card-header">' +
                '<span class="station-icon">🚉</span>' +
                '<span class="station-name">' + lastStation.name + '</span>' +
              '</div>' +
              '<div class="station-card-body">' +
                '<div class="station-stat">' +
                  '<span class="station-label">Crowd Level</span>' +
                  '<span class="station-value">' + ((lastStation.crowd || 0) * 100).toFixed(1) + '%</span>' +
                '</div>' +
                '<div class="station-stat">' +
                  '<span class="station-label">Line</span>' +
                  '<span class="station-value">' + lastStation.route_id + '</span>' +
                '</div>' +
              '</div>' +
            '</div>',
            {
              className: 'station-card-popup',
              closeButton: false,
              autoClose: false,
              closeOnClick: false
            }
          );
        
        // Show popup on hover
        marker.on('mouseover', function() {
          this.openPopup();
        });
        marker.on('mouseout', function() {
          this.closePopup();
        });
        
        window.stationMarkers.push(marker);
        seenStations.add(lastStation.id);
      }
    }

    // Draw DESTINATION segment
    if (destDist > 50) {
      if (destDist > WALK_THRESHOLD) {
        // GRAB route (orange solid line following roads)
        console.log("[Route Display] Drawing GRAB for DESTINATION");
        
        window.fetchWalkingRoute({ lat: destStation.lat, lng: destStation.lng }, dest)
          .then(function (walkingGeom) {
            // Draw glow layer
            var grabGlowLayer = L.geoJSON(walkingGeom, {
              style: { color: "rgba(255, 107, 53, 0.4)", weight: 12, opacity: 0.6, lineCap: "round", lineJoin: "round" }
            }).addTo(map);
            window.grabLayers.push(grabGlowLayer);
            
            // Draw main line
            var grabLayer = L.geoJSON(walkingGeom, {
              style: { color: "#FF6B35", weight: 6, opacity: 0.95, lineCap: "round", lineJoin: "round" }
            }).addTo(map);
            window.grabLayers.push(grabLayer);
            
            // Add Grab icon marker at midpoint of route
            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];
            
            var grabMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createGrabIconMarker(),
              interactive: true,
              zIndexOffset: 2000
            }).addTo(map);
            
            // Bind popup with card content
            grabMarker.bindPopup(createGrabCard(destStation.name, dest.name, destDist), {
              className: 'grab-card-popup',
              closeButton: false,
              autoClose: false,
              closeOnClick: false
            });
            
            // Show popup on hover
            grabMarker.on('mouseover', function() {
              this.openPopup();
            });
            grabMarker.on('mouseout', function() {
              this.closePopup();
            });
            
            window.grabLayers.push(grabMarker);
            
            console.log("[Route Display] Grab route DESTINATION drawn");
          })
          .catch(function (err) {
            console.warn("[Route Display] Grab route DESTINATION failed:", err);
          });
      } else {
        // WALKING route (blue dotted line)
        console.log("[Route Display] Drawing WALKING for DESTINATION");
        window.fetchWalkingRoute({ lat: destStation.lat, lng: destStation.lng }, dest)
          .then(function (walkingGeom) {
            var walkingLayer = L.geoJSON(walkingGeom, {
              style: { color: "#54c1ff", weight: 6, opacity: 0.9, dashArray: "2,8" }
            }).addTo(map);
            window.routeLayers.push(walkingLayer);
            
            // Add walking icon marker at midpoint
            var coords = walkingGeom.coordinates;
            var midIdx = Math.floor(coords.length / 2);
            var midPoint = coords[midIdx];
            
            var walkingMarker = L.marker([midPoint[1], midPoint[0]], {
              icon: createWalkingIconMarker(),
              interactive: true,
              zIndexOffset: 2000
            }).addTo(map);
            
            // Bind popup with card content
            walkingMarker.bindPopup(createWalkingCard(destStation.name, dest.name, destDist), {
              className: 'walking-card-popup',
              closeButton: false,
              autoClose: false,
              closeOnClick: false
            });
            
            // Show popup on hover
            walkingMarker.on('mouseover', function() {
              this.openPopup();
            });
            walkingMarker.on('mouseout', function() {
              this.closePopup();
            });
            
            window.routeLayers.push(walkingMarker);
          })
          .catch(function (err) {
            console.warn("[Route Display] Walking route DESTINATION failed:", err);
          });
      }
    }

    var bounds = L.latLngBounds([start.lat, start.lng], [dest.lat, dest.lng]);
    window.stationMarkers.forEach(function (m) {
      bounds.extend(m.getLatLng());
    });
    map.fitBounds(bounds, { padding: [40, 40] });
  };
})();