// DarkReader bridge for WebViews
(function() {
  if (window.__darkreader_injected) return;
  window.__darkreader_injected = true;

  window.toggleMegaboxDarkReader = function(enable) {
    if (enable) {
      if (typeof DarkReader !== 'undefined') {
        DarkReader.enable({
          brightness: 100,
          contrast: 90,
          sepia: 10
        });
      } else {
        // Fallback CSS filter
        let style = document.getElementById('megabox-dr-fallback');
        if (!style) {
          style = document.createElement('style');
          style.id = 'megabox-dr-fallback';
          style.textContent = 'html { filter: invert(90%) hue-rotate(180deg) !important; background: #181a1b !important; } img, video, canvas { filter: invert(100%) hue-rotate(180deg) !important; }';
          document.head.appendChild(style);
        }
      }
    } else {
      if (typeof DarkReader !== 'undefined') {
        DarkReader.disable();
      }
      const style = document.getElementById('megabox-dr-fallback');
      if (style) style.remove();
    }
  };
})();
