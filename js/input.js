// input.js (WITH FARE CALCULATION)
// Handles routing and insights with fare information

(function () {
    var startInput = document.getElementById("start");
    var destInput = document.getElementById("dest");
    var routeBtn = document.getElementById("routeBtn");
    var infoEl = document.getElementById("info");
    var insightsList = document.getElementById("insightsList");
    var insightsEmpty = document.getElementById("insightsEmpty");
  
    function setInfo(msg) {
      if (infoEl) infoEl.textContent = msg;
      console.log("[Input]", msg);
    }
  
    function formatKm(meters) {
      if (!meters) return "0 km";
      if (meters < 1000) return meters.toFixed(0) + " m";
      return (meters / 1000).toFixed(2) + " km";
    }
  
    function buildInsights(path, startWalkDist, destWalkDist, fareBreakdown) {
      var insights = [];
      
      // Fare summary at the top
      if (fareBreakdown && fareBreakdown.total > 0) {
        insights.push("💰 Total Fare: RM " + fareBreakdown.total.toFixed(2));
        
        // Fare breakdown
        var breakdownParts = [];
        if (fareBreakdown.startTransport > 0) {
          breakdownParts.push(fareBreakdown.startType + " (Start): RM " + fareBreakdown.startTransport.toFixed(2));
        }
        if (fareBreakdown.transit > 0) {
          breakdownParts.push("Transit: RM " + fareBreakdown.transit.toFixed(2));
        }
        if (fareBreakdown.endTransport > 0) {
          breakdownParts.push(fareBreakdown.endType + " (End): RM " + fareBreakdown.endTransport.toFixed(2));
        }
        if (breakdownParts.length > 0) {
          insights.push("   → " + breakdownParts.join(" + "));
        }
      }
      
      if (path && path.length) {
        var travelMinutes = (path.length - 1) * 3;
        if (travelMinutes > 0) {
          insights.push("~" + travelMinutes + " min on board across " + (path.length - 1) + " stops.");
        }
        
        var lines = new Set();
        path.forEach(function(s) { lines.add(s.route_id); });
        
        if (lines.size > 1) {
          insights.push("Expect " + (lines.size - 1) + " transfer(s) across " + Array.from(lines).join(", ") + ".");
        } else if (lines.size === 1) {
          insights.push("Single-line journey on " + Array.from(lines)[0] + ".");
        }
        
        var crowded = [];
        path.forEach(function(s) {
          if ((s.crowd || 0) >= 0.75) crowded.push(s.name);
        });
        if (crowded.length) {
          insights.push("Crowded near " + crowded.slice(0, 3).join(", ") + ".");
        } else {
          insights.push("Crowd levels look manageable along this route.");
        }
      }
  
      // Mention walks with Grab suggestion
      if (startWalkDist > 300) {
        insights.push("Start: " + formatKm(startWalkDist) + " walk. Consider booking a Grab (shown in orange).");
      } else if (startWalkDist > 200) {
        insights.push("Walk about " + formatKm(startWalkDist) + " to reach your start station.");
      }
      
      if (destWalkDist > 300) {
        insights.push("Destination: " + formatKm(destWalkDist) + " walk. Consider booking a Grab (shown in orange).");
      } else if (destWalkDist > 200) {
        insights.push("Walk about " + formatKm(destWalkDist) + " after exiting.");
      }
  
      return insights;
    }
  
    function renderInsights(insights) {
      if (!insightsList) return;
      
      insightsList.innerHTML = "";
      
      if (!insights || !insights.length) {
        if (insightsEmpty) insightsEmpty.classList.remove("hidden");
        insightsList.classList.add("hidden");
        return;
      }
      
      if (insightsEmpty) insightsEmpty.classList.add("hidden");
      insightsList.classList.remove("hidden");
      
      insights.forEach(function (text) {
        var li = document.createElement("li");
        li.textContent = text;
        insightsList.appendChild(li);
      });
    }
  
    async function handleRoute() {
      var startText = startInput.value.trim();
      var destText = destInput.value.trim();
  
      if (!startText || !destText) {
        setInfo("Please enter both start and destination");
        renderInsights([]);
        return;
      }
  
      if (!window.stations || window.stations.length === 0) {
        setInfo("Station data loading, please wait...");
        renderInsights([]);
        return;
      }
  
      routeBtn.disabled = true;
      routeBtn.textContent = "Routing...";
      setInfo("Resolving locations...");
  
      try {
        if (typeof window.toggleAllLines === "function") {
          window.toggleAllLines(false);
        }
  
        var startResult = await window.resolveQueryToNearestStation(startText, window.geocodeWithFallback);
        var destResult = await window.resolveQueryToNearestStation(destText, window.geocodeWithFallback);
  
        if (!startResult || !destResult) {
          setInfo("Could not locate one or both locations");
          renderInsights([]);
          return;
        }
  
        if (!startResult.station && !destResult.station) {
          setInfo('No transit stations specified. Use keywords like "LRT", "MRT", "station"');
          renderInsights([]);
          return;
        }
  
        var startStation = startResult.station || window.findNearestStation(startResult.coords.lat, startResult.coords.lng);
        var destStation = destResult.station || window.findNearestStation(destResult.coords.lat, destResult.coords.lng);
  
        if (!startStation || !destStation) {
          setInfo("Could not find nearby transit stations");
          renderInsights([]);
          return;
        }
  
        setInfo("Calculating route...");
        var path = window.findPathBetweenStations(startStation, destStation);
        if (!path) {
          setInfo("No transit path found between stations");
          renderInsights([]);
          return;
        }
  
        var startObj = { lat: startResult.coords.lat, lng: startResult.coords.lng, name: startText };
        var destObj = { lat: destResult.coords.lat, lng: destResult.coords.lng, name: destText };
  
        var fareBreakdown = window.drawPublicTransportRoute(startObj, destObj, startStation, destStation, path);
  
        var startWalkDist = window.distance(startObj.lat, startObj.lng, startStation.lat, startStation.lng);
        var destWalkDist = window.distance(destObj.lat, destObj.lng, destStation.lat, destStation.lng);
  
        var summary = "Route displayed";
        if (fareBreakdown && fareBreakdown.total > 0) {
          summary += " • Total Fare: RM " + fareBreakdown.total.toFixed(2);
        }
        setInfo(summary);
  
        var insights = buildInsights(path, startWalkDist, destWalkDist, fareBreakdown);
        renderInsights(insights);
  
      } catch (err) {
        console.error("[Input] Error:", err);
        setInfo("Routing failed");
        renderInsights([]);
      } finally {
        routeBtn.disabled = false;
        routeBtn.textContent = "Go";
      }
    }
  
    if (routeBtn) routeBtn.addEventListener("click", handleRoute);
    if (startInput) startInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleRoute(); });
    if (destInput) destInput.addEventListener("keydown", function (e) { if (e.key === "Enter") handleRoute(); });
  
    window.InputHandler = { handleRoute: handleRoute };
  })();