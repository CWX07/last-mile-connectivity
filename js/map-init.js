// map-init.js (UPDATED)
// Pure map initialization with flag icons

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

// Start marker icon (flag emoji)
window.startIcon = L.divIcon({
  className: "marker marker--start",
  html: '<span class="marker-arrow"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Destination marker icon (checkered flag emoji)
window.destIcon = L.divIcon({
  className: "marker marker--dest",
  html: '<span class="marker-arrow"></span>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
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