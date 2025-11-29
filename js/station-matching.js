// station-matching.js (strict version)
// Only match station names if the user explicitly indicates transit intent.

(function(){

  // -------------------------------------------------------
  // Transit intent keywords
  // -------------------------------------------------------
  var transitKeywords = [
      "lrt",
      "mrt",
      "brt",
      "monorail",
      "komuter",
      "ktm",
      "rapid",
      "station",
      "stesen",
      "stn"
  ];

  // -------------------------------------------------------
  // PUBLIC: Try to match a station ONLY if intent is detected
  // -------------------------------------------------------
  window.findStationByName = function(query) {

      if (!query || !window.stations || window.stations.length === 0)
          return null;

      var raw = query.toLowerCase().trim();
      if (!raw) return null;

      // 1. If user typed coordinates → never match station
      if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(raw)) return null;

      // 2. Detect user intent: Do they MEAN a train station?
      var userWantsTransit = transitKeywords.some(k => raw.includes(k));

      if (!userWantsTransit) {
          // User typed a place, not a transit query → never match station
          return null;
      }

      // 3. Clean query (remove extra labels)
      var q = raw
          .replace(/\b(station|stesen|stn|lrt|mrt|brt|monorail|komuter|rapid)\b/g, "")
          .trim();

      if (!q) return null;

      // 4. Try exact or close match
      var best = null;
      var bestScore = 0;

      window.stations.forEach(function(st){
          var name = (st.name || "").toLowerCase();
          if (!name) return;

          // Exact match is best
          if (name === q) {
              best = st;
              bestScore = 1.0;
              return;
          }

          // Fuzzy: small but safe
          var score = similarity(q, name);
          if (score > bestScore) {
              bestScore = score;
              best = st;
          }
      });

      // Require a stricter threshold since intent is declared
      if (best && bestScore >= 0.75) return best;

      return null;
  };

  // -------------------------------------------------------
  // PUBLIC: Geocode a query with station fallback
  // -------------------------------------------------------
  window.geocodeWithFallback = function(query) {
      return new Promise(function(resolve){

          if (!query) return resolve(null);

          var station = window.findStationByName(query);
          if (station) {
              return resolve({
                  lat: station.lat,
                  lng: station.lng,
                  name: station.name,
                  station: station
              });
          }

          // No station match → use geocoder normally
          var url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q="
                    + encodeURIComponent(query);

          fetch(url)
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                  if (!data || !data.length) return resolve(null);

                  var loc = data[0];
                  resolve({
                      lat: parseFloat(loc.lat),
                      lng: parseFloat(loc.lon),
                      name: loc.display_name
                  });
              })
              .catch(() => resolve(null));
      });
  };

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------
  function similarity(a, b) {
      if (!a || !b) return 0;
      var d = levenshtein(a, b);
      return 1 - d / Math.max(a.length, b.length);
  }

  function levenshtein(a, b) {
      var m = [], i, j;
      for (i = 0; i <= b.length; i++) m[i] = [i];
      for (j = 0; j <= a.length; j++) m[0][j] = j;

      for (i = 1; i <= b.length; i++) {
          for (j = 1; j <= a.length; j++) {
              m[i][j] = Math.min(
                  m[i-1][j] + 1,
                  m[i][j-1] + 1,
                  m[i-1][j-1] + (b[i-1] === a[j-1] ? 0 : 1)
              );
          }
      }
      return m[b.length][a.length];
  }

})();