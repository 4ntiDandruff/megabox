
(function() {
  window.__megabox_toggle_darkreader = function(enable) {
    if (enable) {
      if (typeof DarkReader !== "undefined") {
        DarkReader.setFetchMethod(window.fetch);
        DarkReader.enable({
          brightness: 100,
          contrast: 90,
          sepia: 0
        });
      }
    } else {
      if (typeof DarkReader !== "undefined") {
        DarkReader.disable();
      }
    }
  };
})();
