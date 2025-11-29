// map-init.js (FIXED)
// Pure map initialization only. No routing, no station loading.

// Create map
window.map = L.map("map").setView([3.139, 101.686], 12);

// Muted basemap
L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap, ©CartoDB",
  maxZoom: 19,
}).addTo(window.map);

// Route color helper
var ROUTE_COLORS = {
  AG: "#e57200",
  PH: "#76232f",
  KJ: "#D50032",
  MR: "#84bd00",
  MRT: "#047940",
  PYL: "#FFCD00",
  BRT: "#115740",
};

window.getRouteColor = function (routeId) {
  if (!routeId) return "#54c1ff";
  return ROUTE_COLORS[routeId] || "#54c1ff";
};

// GRAB ICON - Define globally for route-display.js
window.grabIcon = L.divIcon({
  className: "marker marker--grab",
  html: '<div style="background: #FF6B35; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 0 8px rgba(255, 107, 53, 0.8);">G</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Start marker icon
window.startIcon = L.divIcon({
  className: "marker marker--start",
  html: '<span class="marker-arrow"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Destination marker icon
window.destIcon = L.divIcon({
  className: "marker marker--dest",
  html: '<span class="marker-arrow"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Global placeholders
window.startMarker = null;
window.destMarker = null;
window.routeLayer = null;
window.stationMarkers = [];
window.routeLayers = [];
window.grabLayers = [];
window.stations = [];

console.log("[Map Init] Map initialized and ready");