// route-display.js (SIMPLIFIED)
// visualization helpers: drawPublicTransportRoute(start,dest,startStation,destStation,path)

(function () {
  var WALK_THRESHOLD = 300; // meters
  
  function getRouteColor(routeId) {
    if (window.getRouteColor) return window.getRouteColor(routeId);
    return "#54c1ff";
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
    })
      .addTo(map)
      .bindPopup("Start: " + (start.name || ""));

    window.destMarker = L.marker([dest.lat, dest.lng], {
      icon: window.destIcon,
      interactive: false,
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
            
            console.log("[Route Display] Grab route START drawn");
          })
          .catch(function (err) {
            console.warn("[Route Display] Grab route START failed:", err);
          });

        if (window.grabIcon) {
          var grabStartMarker = L.marker([start.lat, start.lng], { icon: window.grabIcon, interactive: false })
            .addTo(map)
            .bindPopup("Book Grab to: " + (startStation.name || "station"));
          window.grabLayers.push(grabStartMarker);
        }
      } else {
        // WALKING route (blue dotted line)
        console.log("[Route Display] Drawing WALKING for START");
        window.fetchWalkingRoute(start, { lat: startStation.lat, lng: startStation.lng })
          .then(function (walkingGeom) {
            var walkingLayer = L.geoJSON(walkingGeom, {
              style: { color: "#54c1ff", weight: 6, opacity: 0.9, dashArray: "2,8" }
            }).addTo(map);
            window.routeLayers.push(walkingLayer);
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
              s1.name +
                "<br>Crowd: " + ((s1.crowd || 0) * 100).toFixed(1) + "%" +
                "<br>Route: " + s1.route_id
            );
          window.stationMarkers.push(marker);
          seenStations.add(s1.id);
        }
      }

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
            lastStation.name +
              "<br>Crowd: " + ((lastStation.crowd || 0) * 100).toFixed(1) + "%" +
              "<br>Route: " + lastStation.route_id
          );
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
            
            console.log("[Route Display] Grab route DESTINATION drawn");
          })
          .catch(function (err) {
            console.warn("[Route Display] Grab route DESTINATION failed:", err);
          });

        if (window.grabIcon) {
          var grabDestMarker = L.marker([dest.lat, dest.lng], { icon: window.grabIcon, interactive: false })
            .addTo(map)
            .bindPopup("Book Grab from: " + (destStation.name || "station"));
          window.grabLayers.push(grabDestMarker);
        }
      } else {
        // WALKING route (blue dotted line)
        console.log("[Route Display] Drawing WALKING for DESTINATION");
        window.fetchWalkingRoute({ lat: destStation.lat, lng: destStation.lng }, dest)
          .then(function (walkingGeom) {
            var walkingLayer = L.geoJSON(walkingGeom, {
              style: { color: "#54c1ff", weight: 6, opacity: 0.9, dashArray: "2,8" }
            }).addTo(map);
            window.routeLayers.push(walkingLayer);
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