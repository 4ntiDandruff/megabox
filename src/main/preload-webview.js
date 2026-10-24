// 0. Genuine Chromium Web Environment Simulation for Google & OAuth
(function simulateGenuineChrome() {
  try {
    if (!window.chrome) window.chrome = {};
    if (!window.chrome.csi) window.chrome.csi = function() { return { startE: Date.now(), onloadT: Date.now(), pageT: 0, tran: 15 }; };
    if (!window.chrome.loadTimes) window.chrome.loadTimes = function() { return { requestTime: Date.now() / 1000, startLoadTime: Date.now() / 1000, commitLoadTime: Date.now() / 1000, finishDocumentLoadTime: Date.now() / 1000, finishLoadTime: Date.now() / 1000, firstPaintTime: Date.now() / 1000, firstPaintAfterLoadTime: 0, navigationType: "Other", wasFetchedViaSpdy: true, wasNpnNegotiated: true, npnNegotiatedProtocol: "h2", wasAlternateProtocolAvailable: false, connectionInfo: "h2" }; };
    if (!window.chrome.app) {
      window.chrome.app = {
        isInstalled: false,
        InstallState: { DISABLED: "disabled", INSTALLED: "installed", NOT_INSTALLED: "not_installed" },
        RunningState: { CANNOT_RUN: "cannot_run", READY_TO_RUN: "ready_to_run", RUNNING: "running" },
        getDetails: function() { return null; },
        getIsInstalled: function() { return false; },
        installState: function(cb) { if (cb) cb("not_installed"); },
        runningState: function() { return "cannot_run"; }
      };
    }
  } catch (_) {}
})();

// Megabox WebAuthn & Notification Bridge Layer
const { ipcRenderer } = require('electron');

// 1. WebAuthn U2F protection timeout (fix Electron initial WebAuthn freeze)

// 2. Desktop Notification & Badge Bridge
(function bridgeNotifications() {
  function CustomNotification(title, options = {}) {
    ipcRenderer.sendToHost('notification', { title, options });
    return new EventTarget();
  }

  CustomNotification.permission = 'granted';
  CustomNotification.requestPermission = async () => 'granted';
  window.Notification = CustomNotification;

  // Intercept navigator app badge for unread count
  try {
    Object.defineProperties(window.navigator, {
      setAppBadge: {
        value: function(count) {
          ipcRenderer.sendToHost('badge', count || 0);
          return Promise.resolve();
        },
        writable: false,
        configurable: false
      },
      clearAppBadge: {
        value: function() {
          ipcRenderer.sendToHost('badge', 0);
          return Promise.resolve();
        },
        writable: false,
        configurable: false
      }
    });
  } catch (err) {}
})();

// 3. Document title observer for unread messages (e.g., '(3) WhatsApp')
(function observeTitleBadge() {
  let lastCount = 0;
  const updateBadgeFromTitle = () => {
    const match = document.title.match(/\((\d+)\)/);
    const count = match ? parseInt(match[1], 10) : 0;
    if (count !== lastCount) {
      lastCount = count;
      ipcRenderer.sendToHost('badge', count);
    }
  };

  const observer = new MutationObserver(updateBadgeFromTitle);
  window.addEventListener('DOMContentLoaded', () => {
    const titleEl = document.querySelector('title');
    if (titleEl) {
      observer.observe(titleEl, { subtree: true, characterData: true, childList: true });
    }
  });
})();
// Megabox Unified Recipe Engine (Compatible with Open-Source Recipe Standards)
// Injected into webviews to provide accurate IndexedDB WhatsApp badges, Telegram WebZ/WebK selectors, & darkmode
(function() {
  const { ipcRenderer } = require('electron');

  // Webview Standard Bridge Shim
  window.Megabox = window.Ferdium = {
    setBadge: (direct = 0, indirect = 0) => {
      const count = parseInt(direct, 10) || 0;
      ipcRenderer.sendToHost('badge', count);
    },
    safeParseInt: (text) => {
      if (!text) return 0;
      const parsed = parseInt(text.replace(/[^0-9]/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    },
    loop: (fn, delay = 2000) => {
      setInterval(fn, delay);
    },
    injectCSS: (cssPath) => {},
    handleDarkMode: (cb) => {
      cb(false); // Do not force dark mode on web services
    },
    releaseServiceWorkers: () => {},
    setDialogTitle: (title) => {},
    isImage: () => false,
    openNewWindow: (url) => window.open(url, '_blank')
  };

  // 1. WhatsApp Native IndexedDB Unread Counter (Open Standard Observer)
  if (window.location.hostname.includes('web.whatsapp.com')) {
    let dbCache = null;
    const checkWhatsAppDB = () => {
      if (dbCache) {
        try {
          let unreadCount = 0;
          const txn = dbCache.transaction('chat', 'readonly');
          const store = txn.objectStore('chat');
          const query = store.getAll();
          query.onsuccess = (event) => {
            for (const chat of (event.target.result || [])) {
              if (chat.unreadCount > 0 && !chat.archive) {
                unreadCount += chat.unreadCount;
              }
            }
            window.Megabox.setBadge(unreadCount);
          };
        } catch (e) {
          dbCache = null;
        }
      } else {
        if (window.indexedDB && window.indexedDB.databases) {
          window.indexedDB.databases().then(databases => {
            const hasModel = databases.some(d => d.name === 'model-storage');
            if (hasModel) {
              const req = window.indexedDB.open('model-storage');
              req.onsuccess = () => {
                dbCache = req.result;
                dbCache.onversionchange = () => {
                  dbCache.close();
                  dbCache = null;
                };
              };
            }
          }).catch(() => {});
        }
      }
    };
    setInterval(checkWhatsAppDB, 3000);
  }

  // 2. Telegram WebZ & WebK Counter (Open Standard Observer)
  if (window.location.hostname.includes('web.telegram.org')) {
    const checkTelegram = () => {
      let count = 0;
      // WebZ
      document.querySelectorAll('.chat-list .ListItem.private .ChatBadge.unread:not(.muted), .chat-list .ListItem.group .ChatBadge.unread:not(.muted)').forEach(el => {
        count += window.Megabox.safeParseInt(el.textContent);
      });
      // WebK
      document.querySelectorAll('.rp:not(.is-muted) .dialog-subtitle-badge').forEach(el => {
        count += window.Megabox.safeParseInt(el.textContent);
      });
      if (count > 0) {
        window.Megabox.setBadge(count);
      }
    };
    setInterval(checkTelegram, 2500);
  }

  // 3. Document Title Observer fallback for any other service
  let lastTitleCount = -1;
  const observeTitle = () => {
    const match = document.title.match(/\((\d+)\)/);
    const count = match ? parseInt(match[1], 10) : 0;
    if (count !== lastTitleCount) {
      lastTitleCount = count;
      window.Megabox.setBadge(count);
    }
  };
  setInterval(observeTitle, 2000);

  console.log('[Megabox] Service Shield injected successfully.');
})();
// --- Megabox Web Context Interceptors ---
// 1. Mouse Button 3/4 Navigation Intercept (Back/Forward hardware mouse buttons)
window.addEventListener('mouseup', (event) => {
  if (event.button === 3) window.history.back();
  if (event.button === 4) window.history.forward();
});

// 2. Alt/Meta + Arrow Navigation (Keyboard History)
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) return;
  const isModifier = process.platform === 'darwin' ? e.metaKey : e.altKey;
  if (isModifier && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
    if (e.key === 'ArrowLeft') window.history.back();
    if (e.key === 'ArrowRight') window.history.forward();
  }
});

// 3. Empty Body Self-Healing Watchdog (Auto reload if service hangs on blank white page)
(function initEmptyBodyWatchdog() {
  const emptyValues = ['', '\n', '<head></head><body></body>'];
  let checkCount = 0;
  const checkEmpty = () => {
    try {
      if (document.readyState === 'complete' && (!document.body || emptyValues.includes(document.body.innerHTML.trim()))) {
        checkCount++;
        if (checkCount >= 2) {
          console.warn('[Megabox Watchdog] Empty body detected twice. Triggering auto-recovery reload...');
          window.location.reload();
        }
      } else {
        checkCount = 0;
      }
    } catch (e) {}
  };
  setInterval(checkEmpty, 15000);
})();

// ============================================================================
// Simple Translate - Floating Selection Translator Engine (Cupertino Liquid Glass)
// ============================================================================
(function initSimpleTranslate() {
  let isTranslateActive = true;
  let tooltipEl = null;
  let currentSelectionText = "";
  let lastTranslateTimer = null;
  let activeRequestId = 0;

  // Sync extension enabled state from host
  ipcRenderer.on('translate:toggle-state', (_, enabled) => {
    isTranslateActive = Boolean(enabled);
    if (!isTranslateActive) {
      hideTooltip();
    }
  });

  // Native Lucide SVG icons (Stroke 1.75 - 2px, clean geometry)
  const SVG_ARROW = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.65; flex-shrink:0;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
  const SVG_COPY = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  const SVG_CHECK = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#30D158" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>';
  const SVG_CLOSE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  const SVG_SPINNER = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0071E3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; animation: megabox-spin 0.8s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  const SVG_ERROR = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  function injectKeyframesOnce() {
    if (document.getElementById("megabox-st-styles")) return;
    const style = document.createElement("style");
    style.id = "megabox-st-styles";
    style.textContent = `
      @keyframes megabox-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes megabox-pop-in {
        0% { opacity: 0; transform: scale(0.97) translateY(4px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      #megabox-simple-translate-panel {
        box-sizing: border-box !important;
      }
      #megabox-simple-translate-panel * {
        box-sizing: border-box !important;
      }
      #st-copy-btn {
        transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      #st-copy-btn:hover {
        background: rgba(255, 255, 255, 0.96) !important;
        border-color: rgba(0, 113, 227, 0.28) !important;
        color: #0071E3 !important;
        box-shadow: 0 2px 6px rgba(0, 113, 227, 0.12) !important;
      }
      #st-copy-btn:active {
        transform: scale(0.95) !important;
      }
      #st-close-btn {
        transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      #st-close-btn:hover {
        background: rgba(0, 0, 0, 0.07) !important;
        color: #1D1D1F !important;
      }
      #st-close-btn:active {
        transform: scale(0.92) !important;
      }
      #st-translated-text::-webkit-scrollbar {
        width: 5px;
      }
      #st-translated-text::-webkit-scrollbar-track {
        background: transparent;
      }
      #st-translated-text::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.16);
        border-radius: 9999px;
      }
      #st-translated-text::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.28);
      }
    `;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        (document.head || document.documentElement)?.appendChild(style);
      });
    }
  }

  function createTooltip() {
    if (tooltipEl) return tooltipEl;
    injectKeyframesOnce();

    tooltipEl = document.createElement("div");
    tooltipEl.id = "megabox-simple-translate-panel";
    tooltipEl.style.cssText = [
      "position: absolute",
      "display: none",
      "z-index: 2147483647",
      "background: rgba(255, 255, 255, 0.92)",
      "color: #1D1D1F",
      "backdrop-filter: blur(28px) saturate(190%)",
      "-webkit-backdrop-filter: blur(28px) saturate(190%)",
      "border: 1px solid rgba(255, 255, 255, 0.95)",
      "border-radius: 14px",
      "box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 12px 32px -4px rgba(0, 0, 0, 0.14), 0 20px 48px -12px rgba(0, 113, 227, 0.12), inset 0 1px 0 rgba(255, 255, 255, 1)",
      "font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
      "font-size: 13px",
      "line-height: 1.5",
      "min-width: 280px",
      "max-width: 380px",
      "padding: 12px 14px 13px 14px",
      "user-select: text",
      "box-sizing: border-box",
      "animation: megabox-pop-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards"
    ].join("; ");

    document.documentElement.appendChild(tooltipEl);
    return tooltipEl;
  }

  function hideTooltip() {
    if (tooltipEl) {
      tooltipEl.style.display = "none";
      tooltipEl.innerHTML = "";
    }
  }

  // Listen to translation response sent back from renderer host
  ipcRenderer.on('translate:response', (_, data) => {
    if (!data || data.requestId !== activeRequestId || !tooltipEl) return;
    const res = data.result;

    if (res && res.success) {
      const source = (res.sourceLang || 'auto').toUpperCase();
      const target = (res.targetLang || 'id').toUpperCase();

      tooltipEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:9px; padding-bottom:8px; border-bottom:1px solid rgba(0,0,0,0.06); gap:12px;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex-shrink:1;">
            <div style="display:inline-flex; align-items:center; gap:4px; background:rgba(0,113,227,0.08); border:1px solid rgba(0,113,227,0.18); color:#0071E3; font-weight:700; font-size:10px; letter-spacing:0.04em; padding:2px 7px; border-radius:6px; flex-shrink:0;">
              <span>${source}</span>
              ${SVG_ARROW}
              <span>${target}</span>
            </div>
            <span style="font-size:11px; font-weight:600; color:#86868B; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Terjemahan Instan</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
            <button id="st-copy-btn" type="button" title="Salin terjemahan" style="background:rgba(255,255,255,0.85); border:1px solid rgba(0,0,0,0.09); border-radius:7px; color:#374151; cursor:pointer; font-size:11px; font-weight:600; padding:3.5px 9px; display:inline-flex; align-items:center; gap:5px; height:24px; outline:none;">
              ${SVG_COPY}
              <span>Salin</span>
            </button>
            <button id="st-close-btn" type="button" title="Tutup" style="background:transparent; border:none; border-radius:6px; color:#86868B; cursor:pointer; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; padding:0; outline:none;">
              ${SVG_CLOSE}
            </button>
          </div>
        </div>
        <div id="st-translated-text" style="font-size:13.5px; color:#1D1D1F; font-weight:450; word-break:break-word; max-height:220px; overflow-y:auto; line-height:1.6; padding-right:2px; letter-spacing:-0.01em;">
          ${res.translation}
        </div>
      `;

      const copyBtn = tooltipEl.querySelector('#st-copy-btn');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(res.translation).then(() => {
            copyBtn.innerHTML = `${SVG_CHECK}<span style="color:#30D158; font-weight:700;">Tersalin</span>`;
            copyBtn.style.borderColor = "rgba(48,209,88,0.32)";
            copyBtn.style.background = "rgba(48,209,88,0.09)";
            setTimeout(() => {
              if (copyBtn) {
                copyBtn.innerHTML = `${SVG_COPY}<span>Salin</span>`;
                copyBtn.style.borderColor = "rgba(0,0,0,0.09)";
                copyBtn.style.background = "rgba(255,255,255,0.85)";
              }
            }, 1600);
          }).catch(() => {});
        };
      }

      const closeBtn = tooltipEl.querySelector('#st-close-btn');
      if (closeBtn) closeBtn.onclick = hideTooltip;

    } else {
      tooltipEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding-bottom:7px; border-bottom:1px solid rgba(255,59,48,0.12); gap:10px;">
          <div style="display:flex; align-items:center; gap:6px; min-width:0; flex-shrink:1;">
            ${SVG_ERROR}
            <span style="font-size:11.5px; color:#FF3B30; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Gagal Menerjemahkan</span>
          </div>
          <button id="st-close-btn" type="button" title="Tutup" style="background:transparent; border:none; border-radius:6px; color:#86868B; cursor:pointer; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0; outline:none;">
            ${SVG_CLOSE}
          </button>
        </div>
        <div style="font-size:12px; color:#6B7280; line-height:1.5;">
          ${res && res.error ? res.error : 'Terjadi gangguan jaringan saat menghubungi engine terjemahan.'}
        </div>
      `;
      const closeBtn = tooltipEl.querySelector('#st-close-btn');
      if (closeBtn) closeBtn.onclick = hideTooltip;
    }
  });

  function handleSelection() {
    if (!isTranslateActive) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      hideTooltip();
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 2 || text === currentSelectionText) {
      if (!text) hideTooltip();
      return;
    }
    currentSelectionText = text;

    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        hideTooltip();
        return;
      }

      const panel = createTooltip();
      panel.style.display = "block";
      panel.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding-bottom:7px; border-bottom:1px solid rgba(0,0,0,0.06); gap:12px;">
          <div style="display:flex; align-items:center; gap:8px; min-width:0; flex-shrink:1;">
            <div style="display:inline-flex; align-items:center; gap:3px; background:rgba(0,113,227,0.08); border:1px solid rgba(0,113,227,0.18); color:#0071E3; font-weight:700; font-size:10px; letter-spacing:0.04em; padding:2px 7px; border-radius:6px; flex-shrink:0;">
              AUTO-FLIP
            </div>
            <span style="font-size:11px; font-weight:600; color:#86868B; letter-spacing:-0.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Menerjemahkan...</span>
          </div>
          <button id="st-close-btn" type="button" title="Tutup" style="background:transparent; border:none; border-radius:6px; color:#86868B; cursor:pointer; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; padding:0; flex-shrink:0; outline:none;">
            ${SVG_CLOSE}
          </button>
        </div>
        <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:#6B7280; padding:3px 0 1px 0;">
          ${SVG_SPINNER}
          <span>Menghubungkan ke engine terjemahan...</span>
        </div>
      `;

      // Position tooltip safely within viewport
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      let topPos = rect.bottom + scrollTop + 8;
      let leftPos = rect.left + scrollLeft;

      if (leftPos + 380 > window.innerWidth + scrollLeft) {
        leftPos = Math.max(10, window.innerWidth + scrollLeft - 390);
      }
      panel.style.top = topPos + "px";
      panel.style.left = leftPos + "px";

      const closeBtn = panel.querySelector("#st-close-btn");
      if (closeBtn) closeBtn.onclick = hideTooltip;

      if (lastTranslateTimer) clearTimeout(lastTranslateTimer);
      lastTranslateTimer = setTimeout(() => {
        if (sel.toString().trim() !== text) return;
        activeRequestId++;
        ipcRenderer.sendToHost('translate:request', { requestId: activeRequestId, text });
      }, 250);

    } catch (e) {
      console.warn("[Simple Translate] Selection parse error:", e);
    }
  }

  document.addEventListener("mouseup", (e) => {
    if (tooltipEl && tooltipEl.contains(e.target)) return;
    setTimeout(handleSelection, 20);
  });

  document.addEventListener("mousedown", (e) => {
    if (tooltipEl && !tooltipEl.contains(e.target)) {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        hideTooltip();
      }
    }
  });

  console.log("[Megabox] Simple Translate selection observer mounted via IPC Relay (Liquid Apple Glass).");
})();

// Flag preload loaded for health check
window.__megabox_preload_loaded = true;

// Megabox Webview Zoom Bridge (Ctrl + Wheel & IPC Sync with webFrame)
(function initWheelZoomBridge() {
  try {
    const { webFrame } = require("electron");

    window.__wheel_installed = true;

    // Sync zoom factor from host renderer
    ipcRenderer.on("zoom:set-factor", (_e, factor) => {
      try {
        webFrame.setZoomFactor(typeof factor === "number" ? factor : 1);
      } catch (_) {}
    });
    ipcRenderer.on("zoom:set", (_e, level) => {
      try {
        webFrame.setZoomLevel(typeof level === "number" ? level : 0);
      } catch (_) {}
    });

    // Wheel zoom capture listener on window and document
    const onWheelZoom = (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        const dir = e.deltaY < 0 ? "in" : "out";
        try {
          ipcRenderer.sendToHost("webview-zoom", dir);
        } catch (_) {}
      }
    };

    window.addEventListener("wheel", onWheelZoom, { passive: false, capture: true });
    document.addEventListener("wheel", onWheelZoom, { passive: false, capture: true });
    console.log("[Megabox Preload] Wheel zoom bridge successfully mounted.");
  } catch (err) {
    console.error("[Megabox Preload Error] initWheelZoomBridge:", err);
  }
})();


// ========================================================
// Megawarden: Auto-Capture, Autofill & Suggestion Engine
// ========================================================
(function initMegawardenObserver() {
  try {
    let cachedCredentials = [];
    let activeDropdown = null;
    let lastActiveInput = null;

    // Request available credentials for current domain on load (supports webview sendToHost & popup invoke)
    function requestVaultCredentials() {
      const origin = window.location.href;
      try {
        ipcRenderer.sendToHost("megawarden:request-credentials", { url: origin });
      } catch (_) {}
      try {
        ipcRenderer.invoke("megawarden:find-for-url", { url: origin }).then(res => {
          if (res && res.success && res.matches) {
            cachedCredentials = res.matches;
            if (lastActiveInput && isCredentialInput(lastActiveInput)) {
              showSuggestionDropdown(lastActiveInput);
            }
          }
        }).catch(() => {});
      } catch (_) {}
    }

    // Receive credentials from host
    ipcRenderer.on("megawarden:autofill-data", (_e, data) => {
      if (Array.isArray(data)) {
        cachedCredentials = data;
      } else if (data && typeof data === "object") {
        cachedCredentials = [data];
      } else {
        cachedCredentials = [];
      }

      // If active input is focused, refresh suggestion dropdown
      if (lastActiveInput && isCredentialInput(lastActiveInput)) {
        showSuggestionDropdown(lastActiveInput);
      }
    });

    function isCredentialInput(input) {
      if (!input || input.tagName !== "INPUT" || input.type === "hidden" || input.type === "submit" || input.type === "button") return false;
      const type = (input.type || "text").toLowerCase();
      if (type === "password") return true;

      const meta = ((input.id || "") + " " + (input.name || "") + " " + (input.getAttribute("autocomplete") || "") + " " + (input.placeholder || "")).toLowerCase();
      return (
        type === "email" ||
        meta.includes("user") ||
        meta.includes("login") ||
        meta.includes("email") ||
        meta.includes("account") ||
        meta.includes("identifier") ||
        meta.includes("sandi") ||
        meta.includes("password")
      );
    }

    
    function updateDropdownPosition() {
      if (!activeDropdown || !lastActiveInput || !lastActiveInput.isConnected) return;
      const rect = lastActiveInput.getBoundingClientRect();
      // If input is scrolled completely out of view, hide dropdown
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        removeDropdown();
        return;
      }
      const elWidth = rect.width > 0 ? rect.width : (lastActiveInput.offsetWidth || 300);
      const elLeft = rect.left > 0 ? rect.left : Math.max(8, lastActiveInput.offsetLeft || 100);
      const elBottom = rect.bottom > 0 ? rect.bottom : ((rect.top > 0 ? rect.top : lastActiveInput.offsetTop || 200) + (lastActiveInput.offsetHeight || 45));

      activeDropdown.style.left = `${Math.max(8, elLeft)}px`;
      activeDropdown.style.top = `${elBottom + 6}px`;
      activeDropdown.style.width = `${Math.max(260, Math.min(360, elWidth))}px`;
    }

    function removeDropdown() {
      if (activeDropdown && activeDropdown.parentNode) {
        activeDropdown.parentNode.removeChild(activeDropdown);
      }
      activeDropdown = null;
    }

// Inject scrollbar and hover styles into document head (Trusted Types safe)
    function ensureDropdownStyles() {
      if (document.getElementById("megawarden-overlay-style")) return;
      try {
        const style = document.createElement("style");
        style.id = "megawarden-overlay-style";
        style.textContent = `
          @keyframes mw-fade-in {
            0% { opacity: 0; transform: translateY(-4px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          #megawarden-suggestion-overlay .mw-scroll-list::-webkit-scrollbar {
            width: 5px;
          }
          #megawarden-suggestion-overlay .mw-scroll-list::-webkit-scrollbar-track {
            background: transparent;
          }
          #megawarden-suggestion-overlay .mw-scroll-list::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.16);
            border-radius: 9999px;
          }
          #megawarden-suggestion-overlay .mw-scroll-list::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.32);
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      } catch (_) {}
    }

    function createKeyFallbackSvg() {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "13");
      svg.setAttribute("height", "13");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "#0071E3");
      svg.setAttribute("stroke-width", "2.2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path1.setAttribute("d", "M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9");
      const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path2.setAttribute("d", "m15.5 7.5 3 3L22 7l-3-3");
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "7.5");
      circle.setAttribute("cy", "15.5");
      circle.setAttribute("r", "5.5");
      svg.appendChild(circle);
      svg.appendChild(path1);
      svg.appendChild(path2);
      return svg;
    }

    function showSuggestionDropdown(input) {
      removeDropdown();
      if (!cachedCredentials || cachedCredentials.length === 0) return;
      if (!input || !input.isConnected) return;

      ensureDropdownStyles();

      // Deduplicate credentials by username + password
      const seen = new Set();
      const uniqueCredentials = [];
      for (const cred of cachedCredentials) {
        const key = ((cred.username || "").trim().toLowerCase()) + ":::" + (cred.password || "");
        if (!seen.has(key)) {
          seen.add(key);
          uniqueCredentials.push(cred);
        }
      }
      if (uniqueCredentials.length === 0) return;

      const rect = input.getBoundingClientRect();
      const elWidth = rect.width > 0 ? rect.width : (input.offsetWidth || 300);
      const elLeft = rect.left > 0 ? rect.left : Math.max(8, input.offsetLeft || 100);
      const elBottom = rect.bottom > 0 ? rect.bottom : ((rect.top > 0 ? rect.top : input.offsetTop || 200) + (input.offsetHeight || 45));

      const isPassword = input.type === "password";

      const dropdown = document.createElement("div");
      dropdown.id = "megawarden-suggestion-overlay";
      dropdown.style.cssText = `
        position: fixed;
        left: ${Math.max(8, elLeft)}px;
        top: ${elBottom + 6}px;
        width: ${Math.max(280, Math.min(380, elWidth))}px;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(255, 255, 255, 0.98);
        border-radius: 14px;
        box-shadow: 0 20px 48px -12px rgba(0, 113, 227, 0.16), 0 8px 24px -4px rgba(0, 0, 0, 0.06), inset 0 1px 0 #FFFFFF, inset 0 -1px 0 rgba(0, 0, 0, 0.02);
        backdrop-filter: blur(32px) saturate(190%);
        -webkit-backdrop-filter: blur(32px) saturate(190%);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        color: #1D1D1F;
        overflow: hidden;
        animation: mw-fade-in 0.16s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      // Header: Editorial Clean & Apple Liquid Crystal (No mini capsule AI slop)
      const header = document.createElement("div");
      header.style.cssText = `
        padding: 9px 12px 8px;
        background: rgba(245, 245, 247, 0.65);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        display: flex;
        align-items: center;
        gap: 8px;
        user-select: none;
      `;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "13");
      svg.setAttribute("height", "13");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "#0071E3");
      svg.setAttribute("stroke-width", "2.2");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
      svg.appendChild(path);

      const titleSpan = document.createElement("span");
      titleSpan.style.cssText = "font-size: 11px; font-weight: 600; color: #1D1D1F; letter-spacing: -0.01em;";
      titleSpan.textContent = "Megawarden Vault";

      const countSpan = document.createElement("span");
      countSpan.style.cssText = "margin-left: auto; font-size: 10px; color: #86868B; font-weight: 500;";
      countSpan.textContent = `${uniqueCredentials.length} akun`;

      header.appendChild(svg);
      header.appendChild(titleSpan);
      header.appendChild(countSpan);
      dropdown.appendChild(header);

      // List container with scrollbar for ALL accounts
      const list = document.createElement("div");
      list.className = "mw-scroll-list";
      list.style.cssText = "max-height: 260px; overflow-y: auto; padding: 4px; overscroll-behavior: contain;";

      uniqueCredentials.forEach((cred) => {
        const item = document.createElement("div");
        item.style.cssText = `
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.12s cubic-bezier(0.16, 1, 0.3, 1);
        `;

        item.onmouseenter = () => { 
          item.style.background = "rgba(0, 113, 227, 0.08)";
          item.style.transform = "translateX(2px)";
        };
        item.onmouseleave = () => { 
          item.style.background = "transparent";
          item.style.transform = "none";
        };

        item.onmousedown = (e) => {
          e.preventDefault(); // Prevent input blur
          fillCredential(input, cred, isPassword);
          removeDropdown();
        };

        const iconBox = document.createElement("div");
        iconBox.style.cssText = `
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: #F2F2F7;
          border: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        `;

        // Resolve clean domain for favicon
        let targetDomain = (cred.domain || cred.name || "").toLowerCase().trim();
        if (cred.url && cred.url.startsWith("http")) {
          try {
            targetDomain = new URL(cred.url).hostname.replace(/^www\./, "");
          } catch (_) {}
        }

        if (targetDomain && targetDomain.includes(".")) {
          const img = document.createElement("img");
          img.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(targetDomain)}&sz=64`;
          img.style.cssText = "width: 18px; height: 18px; object-fit: contain; border-radius: 3px;";
          img.loading = "lazy";
          
          let hasFallback = false;
          img.onerror = () => {
            if (!hasFallback) {
              hasFallback = true;
              while (iconBox.firstChild) iconBox.removeChild(iconBox.firstChild);
              iconBox.appendChild(createKeyFallbackSvg());
            }
          };
          iconBox.appendChild(img);
        } else {
          iconBox.appendChild(createKeyFallbackSvg());
        }

        const textCol = document.createElement("div");
        textCol.style.cssText = "min-width: 0; flex: 1;";

        const titleLine = document.createElement("div");
        titleLine.style.cssText = "font-size: 12px; font-weight: 600; color: #1D1D1F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.35;";
        titleLine.textContent = cred.username || "(tanpa username)";

        const subLine = document.createElement("div");
        subLine.style.cssText = "font-size: 10.5px; color: #86868B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;";
        subLine.textContent = cred.name ? (cred.name + (cred.domain && cred.domain !== cred.name ? " - " + cred.domain : "")) : (cred.domain || "Akun Tersimpan");

        textCol.appendChild(titleLine);
        textCol.appendChild(subLine);
        item.appendChild(iconBox);
        item.appendChild(textCol);
        list.appendChild(item);
      });

      dropdown.appendChild(list);

      // Subtle Apple Footer info bar
      const footer = document.createElement("div");
      footer.style.cssText = `
        padding: 5px 12px;
        background: rgba(245, 245, 247, 0.5);
        border-top: 1px solid rgba(0, 0, 0, 0.05);
        display: flex;
        align-items: center;
        justify-content: space-between;
        user-select: none;
      `;
      const footerLeft = document.createElement("div");
      footerLeft.style.cssText = "display: flex; align-items: center; gap: 4px; font-size: 9.5px; color: #86868B;";
      const lockSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      lockSvg.setAttribute("width", "10");
      lockSvg.setAttribute("height", "10");
      lockSvg.setAttribute("viewBox", "0 0 24 24");
      lockSvg.setAttribute("fill", "none");
      lockSvg.setAttribute("stroke", "#86868B");
      lockSvg.setAttribute("stroke-width", "2");
      const lockRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      lockRect.setAttribute("x", "3"); lockRect.setAttribute("y", "11");
      lockRect.setAttribute("width", "18"); lockRect.setAttribute("height", "11");
      lockRect.setAttribute("rx", "2"); lockRect.setAttribute("ry", "2");
      const lockPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      lockPath.setAttribute("d", "M7 11V7a5 5 0 0 1 10 0v4");
      lockSvg.appendChild(lockRect);
      lockSvg.appendChild(lockPath);

      const footerText = document.createElement("span");
      footerText.textContent = "Tersimpan di NVMe lokal";
      footerLeft.appendChild(lockSvg);
      footerLeft.appendChild(footerText);

      const footerRight = document.createElement("span");
      footerRight.style.cssText = "font-size: 9.5px; color: #86868B; font-weight: 500;";
      footerRight.textContent = "Klik untuk isi";

      footer.appendChild(footerLeft);
      footer.appendChild(footerRight);
      dropdown.appendChild(footer);

      document.documentElement.appendChild(dropdown);
      activeDropdown = dropdown;
    }


    function fillCredential(activeInput, cred, isPassword) {
      if (!cred) return;

      // 1. Fill active input
      if (isPassword) {
        activeInput.value = cred.password;
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
        activeInput.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        activeInput.value = cred.username;
        activeInput.dispatchEvent(new Event("input", { bubbles: true }));
        activeInput.dispatchEvent(new Event("change", { bubbles: true }));

        // Also attempt to find password input in the same form/page
        const form = activeInput.closest("form") || document.body;
        const pw = form.querySelector("input[type='password']");
        if (pw && cred.password) {
          pw.value = cred.password;
          pw.dispatchEvent(new Event("input", { bubbles: true }));
          pw.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }

    // Input Focus Listener
    document.addEventListener("focusin", (e) => {
      const target = e.target;
      if (isCredentialInput(target)) {
        lastActiveInput = target;
        if (cachedCredentials.length === 0) {
          requestVaultCredentials();
        } else {
          showSuggestionDropdown(target);
        }
      } else {
        removeDropdown();
      }
    }, true);

    // Input Click Listener
    document.addEventListener("click", (e) => {
      const target = e.target;
      if (isCredentialInput(target)) {
        lastActiveInput = target;
        if (cachedCredentials.length > 0) {
          showSuggestionDropdown(target);
        } else {
          requestVaultCredentials();
        }
      } else if (!e.target.closest("#megawarden-suggestion-overlay")) {
        removeDropdown();
      }
    }, true);

    // Reposition dropdown on window resize or scroll so it follows the input smoothly!
    function onScrollOrResize(e) {
      // If user scrolls INSIDE the suggestion dropdown list, do not reposition or close
      if (e.target && (e.target.id === "megawarden-suggestion-overlay" || e.target.closest("#megawarden-suggestion-overlay"))) {
        return;
      }
      updateDropdownPosition();
    }
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize, true);

    // Auto-capture submission
    function captureLogin(sourceEvent) {
      try {
        const passwordInputs = Array.from(document.querySelectorAll("input[type='password']"));
        if (passwordInputs.length === 0) return;

        const pwInput = passwordInputs.find(i => i.offsetParent !== null) || passwordInputs[0];
        const form = pwInput.closest("form") || document.body;

        const candidates = Array.from(form.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], input:not([type])"));
        const visibleCandidates = candidates.filter(i => i.offsetParent !== null && i !== pwInput);

        let userInput = null;
        for (const input of visibleCandidates) {
          const idName = (input.id + " " + input.name + " " + (input.getAttribute("autocomplete") || "")).toLowerCase();
          if (idName.includes("user") || idName.includes("login") || idName.includes("email") || idName.includes("account") || idName.includes("identifier")) {
            userInput = input;
            break;
          }
        }
        if (!userInput && visibleCandidates.length > 0) {
          userInput = visibleCandidates[0];
        }

        const password = pwInput.value;
        const username = userInput ? userInput.value : "";
        if (!password || password.length < 2) return;

        const url = window.location.href;
        const title = document.title || "";

        const promptData = {
          url,
          title,
          username: username.trim(),
          password: password
        };
        try {
          ipcRenderer.sendToHost("megawarden:save-prompt", promptData);
        } catch (_) {}
        try {
          ipcRenderer.send("megawarden:popup-save-prompt", promptData);
        } catch (_) {}
      } catch (err) {
        console.warn("[Megawarden Preload] Capture error:", err.message);
      }
    }

    document.addEventListener("submit", captureLogin, true);

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[type='submit'], input[type='submit'], button");
      if (!btn) return;
      const text = (btn.innerText || btn.value || "").toLowerCase();
      if (text.includes("login") || text.includes("masuk") || text.includes("sign in") || text.includes("log in") || btn.type === "submit") {
        setTimeout(captureLogin, 50);
      }
    }, true);

    // Initial credentials fetch
    requestVaultCredentials();


    window.__megawarden = {
      getCached: () => cachedCredentials,
      show: (el) => showSuggestionDropdown(el),
      request: () => requestVaultCredentials()
    };

        console.log("[Megawarden Preload] Auto-capture, autofill & interactive suggestion engine active.");
  } catch (err) {
    console.error("[Megawarden Preload Error]:", err);
  }
})();


// ============================================================================
// YouTube SponsorBlock - Smart Segment Skipping Engine (K-Anonymity Privacy API)
// ============================================================================
(function initYouTubeSponsorBlock() {
  const isYouTube = window.location.hostname.includes('youtube.com');
  if (!isYouTube) return;

  let isSponsorBlockActive = true;
  let currentVideoId = null;
  let activeSegments = [];
  let toastEl = null;
  let toastTimeout = null;
  let lastSkippedEnd = 0;

  // Sync state from host
  ipcRenderer.on('sponsorblock:toggle-state', (_, enabled) => {
    isSponsorBlockActive = Boolean(enabled);
    if (!isSponsorBlockActive) {
      activeSegments = [];
      hideToast();
    } else {
      checkCurrentVideo();
    }
  });

  function showToast(text, duration = 3200) {
    if (!document.body) return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'megabox-sponsorblock-toast';
      toastEl.style.cssText = `
        position: fixed;
        bottom: 72px;
        left: 28px;
        z-index: 999999;
        display: none;
        align-items: center;
        gap: 10px;
        background: rgba(28, 28, 30, 0.94);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 12px;
        padding: 9px 15px;
        color: #F2F2F7;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
        font-size: 12.5px;
        font-weight: 500;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      `;
      document.body.appendChild(toastEl);
    }

    toastEl.innerHTML = `
      <div style="width: 20px; height: 20px; border-radius: 6px; background: #0071E3; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
      </div>
      <span>${text}</span>
    `;
    toastEl.style.display = 'flex';
    toastEl.style.opacity = '1';
    toastEl.style.transform = 'translateY(0)';

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => hideToast(), duration);
  }

  function hideToast() {
    if (toastEl) {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(6px)';
      setTimeout(() => {
        if (toastEl) toastEl.style.display = 'none';
      }, 200);
    }
  }

  // SHA-256 for K-Anonymity (first 4 characters of hash)
  async function getPrefix(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 4);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function getCategoryLabel(cat) {
    switch (cat) {
      case 'sponsor': return 'Segmen Sponsor';
      case 'selfpromo': return 'Promosi Channel';
      case 'interaction': return 'Pengingat Like/Sub';
      case 'intro': return 'Intro Video';
      case 'outro': return 'Outro / Credits';
      case 'preview': return 'Cuplikan Teaser';
      default: return 'Segmen Sponsor';
    }
  }

  async function fetchSegments(vid) {
    try {
      const prefix = await getPrefix(vid);
      const categories = encodeURIComponent(JSON.stringify([
        "sponsor", "selfpromo", "interaction", "intro", "outro", "preview"
      ]));
      const url = `https://sponsor.ajay.app/api/skipSegments/${prefix}?categories=${categories}`;
      
      const resp = await fetch(url);
      if (!resp.ok) return [];
      const data = await resp.json();
      const match = data.find(item => item.videoID === vid);
      if (match && Array.isArray(match.segments)) {
        return match.segments.filter(s => s.actionType === 'skip' || !s.actionType);
      }
      return [];
    } catch (e) {
      console.warn('[Megabox SponsorBlock] Fetch error:', e.message);
      return [];
    }
  }

  function extractVideoId(url) {
    try {
      const u = new URL(url || window.location.href);
      if (u.hostname.includes('youtube.com')) {
        return u.searchParams.get('v');
      }
      if (u.hostname.includes('youtu.be')) {
        return u.pathname.substring(1);
      }
    } catch (_) {}
    return null;
  }

  async function checkCurrentVideo() {
    if (!isSponsorBlockActive) return;
    const vid = extractVideoId(window.location.href);
    if (!vid) {
      currentVideoId = null;
      activeSegments = [];
      return;
    }
    if (vid === currentVideoId) return;

    currentVideoId = vid;
    activeSegments = [];
    lastSkippedEnd = 0;

    const segments = await fetchSegments(vid);
    if (vid === currentVideoId) {
      activeSegments = segments;
      if (segments.length > 0) {
        console.log(`[Megabox SponsorBlock] Loaded ${segments.length} skip segments for ${vid}`);
      }
    }
  }

  function monitorVideo() {
    const video = document.querySelector('video');
    if (!video) return;

    video.addEventListener('timeupdate', () => {
      if (!isSponsorBlockActive || !activeSegments || activeSegments.length === 0) return;
      const cur = video.currentTime;

      for (let i = 0; i < activeSegments.length; i++) {
        const seg = activeSegments[i];
        const start = seg.segment[0];
        const end = seg.segment[1];

        // If video enters skip window
        if (cur >= start && cur < end - 0.25) {
          if (Math.abs(lastSkippedEnd - end) > 1) {
            lastSkippedEnd = end;
            video.currentTime = end;
            const label = getCategoryLabel(seg.category);
            showToast(`${label} dilewati (${formatTime(start)} → ${formatTime(end)})`);
            console.log(`[Megabox SponsorBlock] Auto-skipped ${label} from ${start.toFixed(1)}s to ${end.toFixed(1)}s`);
          }
          break;
        }
      }
    });
  }

  // Hook navigation & SPA changes on YouTube
  window.addEventListener('yt-navigate-finish', checkCurrentVideo, true);
  window.addEventListener('popstate', checkCurrentVideo, true);
  window.addEventListener('load', () => {
    checkCurrentVideo();
    monitorVideo();
  });

  // Polling check for lazy-loaded video player
  setInterval(() => {
    const video = document.querySelector('video');
    if (video && !video.dataset.mbSbHooked) {
      video.dataset.mbSbHooked = 'true';
      monitorVideo();
    }
    const vid = extractVideoId(window.location.href);
    if (vid && vid !== currentVideoId) {
      checkCurrentVideo();
    }
  }, 1500);

  console.log('[Megabox SponsorBlock] YouTube SponsorBlock engine initialized (K-Anonymity mode).');
})();

// ============================================================================
// YouTube Anti-Adblock & Undetected Ad Skipper (RemoveAdblockThing Native)
// ============================================================================
(function initYouTubeAntiAdblock() {
  const isYouTube = window.location.hostname.includes("youtube.com");
  if (!isYouTube) return;

  let isEngineActive = true;
  let adblockStyleEl = null;

  // Listen for toggle IPC from Megabox renderer
  try {
    const { ipcRenderer } = require("electron");
    ipcRenderer.on("adblock-thing:toggle-state", (_event, enabled) => {
      isEngineActive = !!enabled;
      if (!isEngineActive && adblockStyleEl) {
        adblockStyleEl.remove();
        adblockStyleEl = null;
      } else if (isEngineActive) {
        injectAdblockCSS();
      }
      console.log("[Megabox AdblockThing] Engine active state:", isEngineActive);
    });
  } catch (_) {}

  // 1. Lock window.google_ad_status in both preload & main page world (via webFrame)
  function lockGoogleAdStatus() {
    try {
      window.google_ad_status = 1;
      Object.defineProperty(window, "google_ad_status", {
        configurable: false,
        enumerable: true,
        get() { return 1; },
        set() {}
      });
    } catch (_) {}
    try {
      const { webFrame } = require("electron");
      webFrame.executeJavaScript("window.google_ad_status = 1; try { Object.defineProperty(window, 'google_ad_status', { value: 1, writable: false }); } catch (_) {}");
    } catch (_) {}
  }
  lockGoogleAdStatus();
  document.addEventListener("DOMContentLoaded", lockGoogleAdStatus, { once: true });

  // 2. Inject CSS rules to hide ad slots, banners & backdrop modal
  function injectAdblockCSS() {
    if (document.getElementById("megabox-adblock-thing-style")) return;
    const style = document.createElement("style");
    style.id = "megabox-adblock-thing-style";
    style.textContent = `
      ytd-action-companion-ad-renderer,
      ytd-display-ad-renderer,
      ytd-video-masthead-ad-advertiser-info-renderer,
      ytd-video-masthead-ad-primary-video-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytd-ad-slot-renderer,
      yt-about-this-ad-renderer,
      yt-mealbar-promo-renderer,
      ytd-statement-banner-renderer,
      ytd-banner-promo-renderer-background,
      .ytd-video-masthead-ad-v3-renderer,
      div#root.style-scope.ytd-display-ad-renderer.yt-simple-endpoint,
      div#sparkles-container.style-scope.ytd-promoted-sparkles-web-renderer,
      div#main-container.style-scope.ytd-promoted-video-renderer,
      div#player-ads.style-scope.ytd-watch-flexy,
      ad-slot-renderer,
      ytm-promoted-sparkles-web-renderer,
      masthead-ad,
      #masthead-ad,
      tp-yt-iron-overlay-backdrop,
      .style-scope.ytd-enforcement-message-view-model {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
    adblockStyleEl = style;
  }

  // 3. Fast popup remover and ad skipper loop (300ms)
  function runAdRemover() {
    if (!isEngineActive) return;

    // Check & dismiss YouTube enforcement anti-adblock modal
    const popupBackdrop = document.querySelector("tp-yt-iron-overlay-backdrop");
    if (popupBackdrop) {
      popupBackdrop.removeAttribute("opened");
      popupBackdrop.remove();
    }

    const popup = document.querySelector(".style-scope ytd-enforcement-message-view-model");
    if (popup) {
      const dismissBtn = document.getElementById("dismiss-button") || popup.querySelector("button");
      if (dismissBtn) dismissBtn.click();
      popup.remove();
      if (document.body && document.body.style) {
        document.body.style.setProperty("overflow-y", "auto", "important");
      }
      const video = document.querySelector("video");
      if (video && video.paused) {
        try { video.play(); } catch (_) {}
      }
    }

    // Undetected Video Ad Skipper
    const adContainer = document.querySelector(".ad-showing, .ad-interrupting");
    const video = document.querySelector("video");
    if (adContainer && video) {
      video.muted = true;
      video.playbackRate = 16;
      if (!isNaN(video.duration) && video.duration > 0 && isFinite(video.duration)) {
        video.currentTime = video.duration - 0.1;
      }
      const skipBtn = document.querySelector(".ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button");
      if (skipBtn) {
        skipBtn.click();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectAdblockCSS);
  } else {
    injectAdblockCSS();
  }

  setInterval(runAdRemover, 300);
  console.log("[Megabox AdblockThing] YouTube Anti-Adblock & Video Ad Skipper active.");
})();

// ============================================================================
// YouTube NonStop - Inactivity "Video Paused. Continue Watching?" Auto-Confirm
// ============================================================================
(function initYouTubeNonStop() {
  const isYouTube = window.location.hostname.includes("youtube.com");
  if (!isYouTube) return;

  let isNonStopActive = true;

  try {
    const { ipcRenderer } = require("electron");
    ipcRenderer.on("nonstop:toggle-state", (_event, enabled) => {
      isNonStopActive = !!enabled;
      console.log("[Megabox NonStop] Active state:", isNonStopActive);
    });
  } catch (_) {}

  function autoConfirmWatching() {
    if (!isNonStopActive) return;

    // 1. YouTube standard & YouTube Music "Still there?" confirmation dialogs
    const confirmDialog = document.querySelector("yt-confirm-dialog-renderer, ytd-popup-container yt-confirm-dialog-renderer, ytmusic-you-there-renderer");
    if (confirmDialog) {
      // Find confirm or continue button
      const confirmBtn = confirmDialog.querySelector("#confirm-button, yt-button-renderer#confirm-button, button.yt-spec-button-shape-next");
      if (confirmBtn) {
        confirmBtn.click();
        console.log("[Megabox NonStop] Auto-clicked 'Continue watching' prompt.");
      }
      // Resume video playback immediately
      const video = document.querySelector("video");
      if (video && video.paused) {
        try { video.play(); } catch (_) {}
      }
    }

    // 2. Event-based fallback: if video is paused by inactivity prompt
    const pausedOverlay = document.querySelector(".ytp-pause-overlay");
    if (pausedOverlay && pausedOverlay.style.display !== "none") {
      const video = document.querySelector("video");
      if (video && video.paused) {
        // Only resume if pause wasn't triggered by user manual click
        const youThereBox = document.querySelector("ytmusic-you-there-renderer, ytd-action-companion-ad-renderer");
        if (youThereBox) {
          try { video.play(); } catch (_) {}
        }
      }
    }
  }

  // Intercept YouTube popup opened event for 0ms instant dismissal
  document.addEventListener("yt-popup-opened", (e) => {
    if (!isNonStopActive) return;
    const nodename = e && e.detail && e.detail.nodeName ? e.detail.nodeName : "";
    if (nodename.includes("CONFIRM") || nodename.includes("YOU-THERE")) {
      const popupContainer = document.querySelector("ytd-popup-container, ytmusic-popup-container");
      if (popupContainer) {
        const btn = popupContainer.querySelector("#confirm-button, button");
        if (btn) btn.click();
      }
      const video = document.querySelector("video");
      if (video && video.paused) {
        try { video.play(); } catch (_) {}
      }
      console.log("[Megabox NonStop] Intercepted yt-popup-opened and auto-resumed playback.");
    }
  }, true);

  // Periodic watch loop (every 1.5s, ultra-low CPU)
  setInterval(autoConfirmWatching, 1500);
  console.log("[Megabox NonStop] YouTube NonStop background playback watcher active.");
})();

// ============================================================================
// YouTube Shorts Blocker & Redirector (Remove Shorts from YouTube Native)
// ============================================================================
(function initYouTubeShortsBlocker() {
  const isYouTube = window.location.hostname.includes("youtube.com");
  if (!isYouTube) return;

  let isShortsBlockerActive = true;
  let styleEl = null;

  try {
    const { ipcRenderer } = require("electron");
    ipcRenderer.on("shortsblocker:toggle-state", (_event, enabled) => {
      isShortsBlockerActive = !!enabled;
      if (!isShortsBlockerActive && styleEl) {
        styleEl.remove();
        styleEl = null;
      } else if (isShortsBlockerActive) {
        injectShortsCSS();
        checkRedirectShorts();
      }
      console.log("[Megabox ShortsBlocker] Active state:", isShortsBlockerActive);
    });
  } catch (_) {}

  // 1. Hide Shorts tab, shelves & badges via selective CSS
  function injectShortsCSS() {
    if (document.getElementById("megabox-shorts-blocker-style")) return;
    const style = document.createElement("style");
    style.id = "megabox-shorts-blocker-style";
    style.textContent = `
      /* Hide Shorts in sidebar / guide navigation */
      ytd-guide-entry-renderer:has(a[title*="Shorts"]),
      ytd-mini-guide-entry-renderer:has(a[title*="Shorts"]),
      ytd-guide-entry-renderer:has(a[href^="/shorts"]),
      ytd-mini-guide-entry-renderer:has(a[href^="/shorts"]),
      ytm-pivot-bar-item-renderer:has(div[class*="pivot-shorts"]),
      
      /* Hide Shorts shelf on Home & Subscriptions */
      ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
      ytd-reel-shelf-renderer,
      
      /* Hide individual Shorts in search results & related videos */
      ytd-video-renderer:has(a[href*="/shorts/"]),
      ytd-grid-video-renderer:has(a[href*="/shorts/"]),
      ytd-rich-item-renderer:has(a[href*="/shorts/"]) {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
    styleEl = style;
  }

  // 2. Auto-redirect /shorts/VIDEO_ID to standard /watch?v=VIDEO_ID player
  function checkRedirectShorts() {
    if (!isShortsBlockerActive) return;
    const currentUrl = window.location.href;
    if (currentUrl.includes("/shorts/")) {
      const match = currentUrl.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const videoId = match[1];
        const newUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`[Megabox ShortsBlocker] Redirecting Shorts to regular player: ${newUrl}`);
        window.location.replace(newUrl);
      }
    }
  }

  // Listen to navigation events
  window.addEventListener("yt-navigate-start", checkRedirectShorts, true);
  window.addEventListener("yt-navigate-finish", checkRedirectShorts, true);
  window.addEventListener("popstate", checkRedirectShorts, true);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      injectShortsCSS();
      checkRedirectShorts();
    });
  } else {
    injectShortsCSS();
    checkRedirectShorts();
  }

  // Fallback observer for SPA updates
  setInterval(checkRedirectShorts, 1000);
  console.log("[Megabox ShortsBlocker] YouTube Shorts Blocker & Redirector active.");
})();

// ============================================================================
// YouTube Enhancer Engine - Draggable Mini-Player, Auto Quality, Audio Track & Controls
// ============================================================================
(function initYouTubeEnhancer() {
  const isYouTube = window.location.hostname.includes("youtube.com");
  if (!isYouTube) return;

  let isEnhancerActive = true;
    let toolbarEl = null;
  let isPopupActive = false;
  let isPopupDismissedByUser = false;
  let overlayEl = null;

  // Enhancer Preferences
  let prefQuality = localStorage.getItem("mb_enhancer_quality") || "hd1080";
  let prefPreferIndo = localStorage.getItem("mb_enhancer_prefer_indo") !== "false"; // Default true
  let prefSubtitleIndo = localStorage.getItem("mb_enhancer_sub_indo") === "true"; // Default false

  // Mini-player draggable coordinates
  let popupCoords = { x: 17, y: 72 };
  try {
    const savedPos = JSON.parse(localStorage.getItem("mb_enhancer_popup_pos") || "null");
    if (savedPos && typeof savedPos.x === "number" && typeof savedPos.y === "number") {
      popupCoords = savedPos;
    }
  } catch (_) {}

  // Helper DOM creator compliant with YouTube TrustedTypes
  function createSvgIcon(width, height, pathD, strokeWidth = "2", fill = "none", stroke = "currentColor") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", fill);
    svg.setAttribute("stroke", stroke);
    svg.setAttribute("stroke-width", strokeWidth);
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.style.setProperty("width", width + "px", "important");
    svg.style.setProperty("height", height + "px", "important");
    svg.style.setProperty("min-width", width + "px", "important");
    svg.style.setProperty("display", "block", "important");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    svg.appendChild(path);
    return svg;
  }

  function formatTime(sec) {
    if (!sec || isNaN(sec)) return "0:00";
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function updatePopupCssVars(x, y) {
    const maxX = Math.max(10, window.innerWidth - 460);
    const maxY = Math.max(10, window.innerHeight - 270);
    const clampedX = Math.min(Math.max(10, x), maxX);
    const clampedY = Math.min(Math.max(10, y), maxY);

    popupCoords.x = clampedX;
    popupCoords.y = clampedY;
    document.documentElement.style.setProperty("--mb-popup-left", clampedX + "px");
    document.documentElement.style.setProperty("--mb-popup-top", clampedY + "px");
    try {
      localStorage.setItem("mb_enhancer_popup_pos", JSON.stringify(popupCoords));
    } catch (_) {}
  }

  // Inject CSS rules for Enhancer Popup, Mini-Player & Clutter hiding
  function ensureEnhancerStyles() {
    if (document.getElementById("megabox-enhancer-styles")) return;
    const style = document.createElement("style");
    style.id = "megabox-enhancer-styles";
    style.textContent = `
      :root {
        --mb-popup-top: ${popupCoords.y}px;
        --mb-popup-left: ${popupCoords.x}px;
      }

      /* Elevate stacking context of #player so it renders above shelves and comments */
      [mb-popup-active] #player {
        position: relative !important;
        z-index: 2147483640 !important;
      }

      /* Placeholder to prevent layout shift during popup mode */
      #mb-player-placeholder {
        display: none;
        width: 100%;
        pointer-events: none;
        visibility: hidden;
      }

      /* Float player window to dynamic coordinates */
      [mb-popup-active] #ytd-player,
      body[mb-popup-active]:not(:has(#ytd-player)) #player {
        position: fixed !important;
        top: var(--mb-popup-top, 72px) !important;
        left: var(--mb-popup-left, 17px) !important;
        width: 448px !important;
        height: 252px !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 2147483640 !important;
        border-radius: 12px !important;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.12) !important;
        overflow: hidden !important;
        background: #000000 !important;
        transform: translateZ(0) !important;
        transition: box-shadow 0.2s ease !important;
      }

      /* Force #movie_player, #player-wrap, #player-api and containers to cleanly fit inside mini-player */
      [mb-popup-active] #player-wrap,
      [mb-popup-active] #player-api,
      [mb-popup-active] #movie_player,
      [mb-popup-active] .html5-video-container {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      [mb-popup-active] .html5-video-container {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
      }

      [mb-popup-active] #movie_player video {
        width: 100% !important;
        height: 100% !important;
        top: 0 !important;
        left: 0 !important;
        object-fit: contain !important;
        position: absolute !important;
      }

      /* Hide default cluttered YouTube controls in popup mode */
      [mb-popup-active] .ytp-chrome-bottom,
      [mb-popup-active] .ytp-chrome-top,
      [mb-popup-active] .ytp-gradient-bottom,
      [mb-popup-active] .ytp-gradient-top,
      [mb-popup-active] .ytp-ce-element,
      [mb-popup-active] .ytp-paid-content-overlay,
      [mb-popup-active] .html5-endscreen,
      [mb-popup-active] .videowall-endscreen,
      [mb-popup-active] #megabox-enhancer-bar {
        display: none !important;
      }

      /* Dedicated Clean Overlay Matching Reference Screenshot with Draggable Handle */
      #mb-enhancer-ref-overlay {
        position: fixed !important;
        top: var(--mb-popup-top, 72px) !important;
        left: var(--mb-popup-left, 17px) !important;
        width: 448px !important;
        height: 252px !important;
        z-index: 2147483645 !important;
        border-radius: 12px !important;
        pointer-events: none !important;
        overflow: hidden !important;
        display: none;
      }

      [mb-popup-active] ~ #mb-enhancer-ref-overlay,
      body[mb-popup-active] #mb-enhancer-ref-overlay,
      body:has([mb-popup-active]) #mb-enhancer-ref-overlay {
        display: block !important;
      }

      /* Top Drag Handle Header - Fast fade */
      #mb-ref-drag-handle {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 44px;
        cursor: move;
        pointer-events: auto;
        z-index: 1;
        display: flex;
        align-items: center;
        padding: 0 10px;
        background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%);
        opacity: 0;
        transition: opacity 0.1s ease;
      }
      #mb-enhancer-ref-overlay:hover #mb-ref-drag-handle {
        opacity: 1;
      }

      /* Close button (White circle with black X) at top-left */
      #mb-ref-close-btn {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #FFFFFF;
        color: #000000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        border: none;
        padding: 0;
        transition: transform 0.15s ease, background 0.15s ease;
      }
      #mb-ref-close-btn:hover {
        background: #E5E5E5;
        transform: scale(1.08);
      }
      #mb-ref-close-btn:active {
        transform: scale(0.92);
      }

      /* Drag Cue Icon */
      #mb-ref-drag-hint {
        margin-left: auto;
        color: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        user-select: none;
        font-size: 11px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        gap: 4px;
      }

      /* Bottom bar with play/pause, volume circle, time pill - Fast fade */
      #mb-ref-bottom-bar {
        position: absolute;
        bottom: 10px;
        left: 12px;
        right: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
        z-index: 2;
        opacity: 0;
        transition: opacity 0.1s ease;
      }
      #mb-enhancer-ref-overlay:hover #mb-ref-bottom-bar {
        opacity: 1;
      }

      #mb-ref-play-btn {
        width: 28px;
        height: 28px;
        background: transparent;
        border: none;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: transform 0.15s ease;
      }
      #mb-ref-play-btn:hover {
        transform: scale(1.1);
      }

      #mb-ref-vol-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(30, 30, 30, 0.38);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        transition: background 0.1s ease, transform 0.1s ease;
      }
      #mb-ref-vol-btn:hover {
        background: rgba(45, 45, 45, 0.65);
        transform: scale(1.05);
      }

      #mb-ref-time-pill {
        height: 28px;
        padding: 0 10px;
        border-radius: 14px;
        background: rgba(30, 30, 30, 0.38);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #FFFFFF;
        font-family: Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        user-select: none;
        letter-spacing: 0.02em;
      }

      #mb-ref-progress-container {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: rgba(255, 255, 255, 0.25);
        cursor: pointer;
        pointer-events: auto;
        z-index: 2;
      }
      #mb-ref-progress-fill {
        height: 100%;
        width: 0%;
        background: #FF0000;
        transition: width 0.1s linear;
      }
    `;
    const target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        (document.head || document.documentElement)?.appendChild(style);
      });
    }
  }

  try {
    const { ipcRenderer } = require("electron");
    ipcRenderer.on("enhancer:toggle-state", (_event, enabled) => {
      isEnhancerActive = !!enabled;
      if (!isEnhancerActive) {
        if (toolbarEl) toolbarEl.style.display = "none";
        
        deactivateVideoPopup();
      } else {
        if (toolbarEl) toolbarEl.style.display = "flex";
      }
      console.log("[Megabox Enhancer] Active state:", isEnhancerActive);
    });
  } catch (_) {}

  function showEnhancerFeedback(text) {
    let pill = document.getElementById("megabox-enhancer-pill");
    if (!pill) {
      pill = document.createElement("div");
      pill.id = "megabox-enhancer-pill";
      pill.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999999;
        background: rgba(28, 28, 30, 0.92);
        color: #FFFFFF;
        padding: 8px 18px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.2);
        pointer-events: none;
        backdrop-filter: blur(16px);
        transition: opacity 0.2s ease;
      `;
      (document.body || document.documentElement).appendChild(pill);
    }
    pill.textContent = text;
    pill.style.opacity = "1";
    clearTimeout(pill._timer);
    pill._timer = setTimeout(() => { pill.style.opacity = "0"; }, 1500);
  }

  // Mouse scroll-wheel preserves normal page scrolling (no volume hijacking)



  // 4. Draggable Mini-Player Overlay
  function ensureOverlayExists() {
    let overlay = document.getElementById("mb-enhancer-ref-overlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "mb-enhancer-ref-overlay";

    // Top Drag Handle
    const dragHandle = document.createElement("div");
    dragHandle.id = "mb-ref-drag-handle";

    // Close button (White circle with black X) inside drag handle
    const closeBtn = document.createElement("button");
    closeBtn.id = "mb-ref-close-btn";
    closeBtn.title = "Tutup Mini-Player";
    closeBtn.appendChild(createSvgIcon("14", "14", "M18 6L6 18M6 6l12 12", "2.6", "none", "#000000"));
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      isPopupDismissedByUser = true;
      deactivateVideoPopup();
      showEnhancerFeedback("Mini-Player ditutup");
    };
    dragHandle.appendChild(closeBtn);

    // Drag Cue Hint
    const dragHint = document.createElement("div");
    dragHint.id = "mb-ref-drag-hint";
    dragHint.appendChild(createSvgIcon("12", "12", "M8 9l4-4 4 4m0 6l-4 4-4-4", "2"));
    const hintText = document.createElement("span");
    hintText.textContent = "Geser";
    dragHint.appendChild(hintText);
    dragHandle.appendChild(dragHint);

    // Draggable logic via pointer events
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = popupCoords.x;
    let origTop = popupCoords.y;

    dragHandle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("#mb-ref-close-btn")) return;
      isDragging = true;
      dragHandle.setPointerCapture(e.pointerId);
      startX = e.clientX;
      startY = e.clientY;
      origLeft = popupCoords.x;
      origTop = popupCoords.y;
      e.preventDefault();
    });

    dragHandle.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      updatePopupCssVars(origLeft + dx, origTop + dy);
    });

    const stopDrag = () => {
      if (isDragging) {
        isDragging = false;
      }
    };
    dragHandle.addEventListener("pointerup", stopDrag);
    dragHandle.addEventListener("pointercancel", stopDrag);

    overlay.appendChild(dragHandle);

    // Progress bar
    const progCont = document.createElement("div");
    progCont.id = "mb-ref-progress-container";
    const progFill = document.createElement("div");
    progFill.id = "mb-ref-progress-fill";
    progCont.appendChild(progFill);
    progCont.onclick = (e) => {
      e.stopPropagation();
      const video = document.querySelector("video");
      if (video && video.duration) {
        const rect = progCont.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        video.currentTime = pct * video.duration;
      }
    };
    overlay.appendChild(progCont);

    // Bottom bar
    const bottomBar = document.createElement("div");
    bottomBar.id = "mb-ref-bottom-bar";

    // Play/Pause button
    const playBtn = document.createElement("button");
    playBtn.id = "mb-ref-play-btn";
    function updatePlayIcon() {
      while (playBtn.firstChild) playBtn.removeChild(playBtn.firstChild);
      const video = document.querySelector("video");
      if (video && video.paused) {
        playBtn.appendChild(createSvgIcon("20", "20", "M5 3l14 9-14 9V3z", "2", "#FFFFFF", "#FFFFFF"));
      } else {
        playBtn.appendChild(createSvgIcon("20", "20", "M6 4h4v16H6zm8 0h4v16h-4z", "2", "#FFFFFF", "#FFFFFF"));
      }
    }
    updatePlayIcon();
    playBtn.onclick = (e) => {
      e.stopPropagation();
      const video = document.querySelector("video");
      if (!video) return;
      if (video.paused) video.play(); else video.pause();
      updatePlayIcon();
    };
    bottomBar.appendChild(playBtn);

    // Volume Speaker button
    const volBtn = document.createElement("button");
    volBtn.id = "mb-ref-vol-btn";
    function updateVolIcon() {
      while (volBtn.firstChild) volBtn.removeChild(volBtn.firstChild);
      const video = document.querySelector("video");
      if (!video || video.muted || video.volume === 0) {
        volBtn.appendChild(createSvgIcon("16", "16", "M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6", "2"));
      } else {
        volBtn.appendChild(createSvgIcon("16", "16", "M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07", "2"));
      }
    }
    updateVolIcon();
    volBtn.onclick = (e) => {
      e.stopPropagation();
      const video = document.querySelector("video");
      if (!video) return;
      video.muted = !video.muted;
      updateVolIcon();
    };
    volBtn.onwheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const video = document.querySelector("video");
      if (!video) return;
      if (e.deltaY < 0) {
        video.volume = Math.min(1, video.volume + 0.05);
      } else {
        video.volume = Math.max(0, video.volume - 0.05);
      }
      video.muted = false;
      updateVolIcon();
    };
    bottomBar.appendChild(volBtn);

    // Time pill
    const timePill = document.createElement("div");
    timePill.id = "mb-ref-time-pill";
    function updateTimeText() {
      const video = document.querySelector("video");
      if (video) {
        timePill.textContent = formatTime(video.currentTime) + " / " + formatTime(video.duration);
        if (progFill && video.duration) {
          progFill.style.width = ((video.currentTime / video.duration) * 100) + "%";
        }
      }
    }
    updateTimeText();
    bottomBar.appendChild(timePill);

    overlay.appendChild(bottomBar);
    (document.body || document.documentElement).appendChild(overlay);

    // Video event hook
    setInterval(() => {
      const video = document.querySelector("video");
      if (!video) return;
      if (!video.dataset.mbOverlayBound) {
        video.dataset.mbOverlayBound = "true";
        video.addEventListener("play", updatePlayIcon);
        video.addEventListener("pause", updatePlayIcon);
        video.addEventListener("volumechange", updateVolIcon);
        video.addEventListener("timeupdate", updateTimeText);
      }
    }, 1000);

    overlayEl = overlay;
    return overlay;
  }

  // 5. Floating Video Popup Engine
  function activateVideoPopup() {
    if (!isEnhancerActive || isPopupActive || isPopupDismissedByUser) return;
    ensureEnhancerStyles();

    const targetEl = document.querySelector("ytd-watch-flexy") || document.querySelector("ytd-watch-grid") || document.body;
    const container = document.querySelector("#player-container-outer") || document.querySelector("#player-wrap") || document.querySelector("#player");
    const moviePlayer = document.querySelector("#movie_player");
    if (!targetEl || !container || !moviePlayer) return;

    // Maintain document layout flow with placeholder
    const origHeight = container.offsetHeight || 480;
    let placeholder = document.getElementById("mb-player-placeholder");
    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.id = "mb-player-placeholder";
      const anchor = document.querySelector("#player-container-outer") || document.querySelector("#player");
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(placeholder, anchor);
      }
    }
    if (placeholder) {
      placeholder.style.height = origHeight + "px";
      placeholder.style.display = "block";
    }

    if (container.offsetHeight > 100) {
      targetEl.style.setProperty("--mb-orig-player-height", container.offsetHeight + "px");
    }

    ensureOverlayExists();
    if (overlayEl) overlayEl.style.display = "block";

    targetEl.setAttribute("mb-popup-active", "");
    isPopupActive = true;
    window.dispatchEvent(new Event("resize"));
  }

  function deactivateVideoPopup() {
    if (!isPopupActive) return;
    const targetEl = document.querySelector("[mb-popup-active]");
    if (targetEl) targetEl.removeAttribute("mb-popup-active");
    if (overlayEl) overlayEl.style.display = "none";

    const placeholder = document.getElementById("mb-player-placeholder");
    if (placeholder) placeholder.style.display = "none";

    isPopupActive = false;
    window.dispatchEvent(new Event("resize"));
  }

  function setupScrollPopupObserver() {
    window.addEventListener("scroll", () => {
      if (!isEnhancerActive) return;
      if (!window.location.pathname.includes("/watch")) {
        if (isPopupActive) deactivateVideoPopup();
        return;
      }

      if (window.scrollY < 50) {
        isPopupDismissedByUser = false;
      }

      const placeholder = document.getElementById("mb-player-placeholder");
      const container = (isPopupActive && placeholder && placeholder.style.display !== "none")
        ? placeholder
        : (document.querySelector("#player-container-outer") || document.querySelector("#player-wrap") || document.querySelector("#player"));
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const isOutOfView = rect.bottom < 60;

      if (isOutOfView) {
        if (!isPopupActive && !isPopupDismissedByUser) {
          activateVideoPopup();
        }
      } else {
        if (isPopupActive) {
          deactivateVideoPopup();
        }
      }
    }, { passive: true });
  }

  // 6. Auto Video Quality Engine (Kunci Resolusi HD 1080p Otomatis)
  let lastQualityAppliedVideoId = null;
  function enforceAutoQuality() {
    if (!isEnhancerActive) return;
    const player = document.getElementById("movie_player");
    if (!player || typeof player.setPlaybackQualityRange !== "function") return;

    const videoId = player.getVideoData ? player.getVideoData()?.video_id : null;
    if (!videoId) return;

    if (lastQualityAppliedVideoId === videoId && player.getPlaybackQuality() === prefQuality) return;

    const available = player.getAvailableQualityLevels ? player.getAvailableQualityLevels() : [];
    if (!available || available.length === 0) return;

    // Pick closest quality if preferred is not available
    let target = prefQuality;
    if (!available.includes(target)) {
      if (available.includes("hd1080")) target = "hd1080";
      else if (available.includes("hd720")) target = "hd720";
      else target = available[0];
    }

    try {
      player.setPlaybackQualityRange(target, target);
      if (typeof player.setPlaybackQuality === "function") {
        player.setPlaybackQuality(target);
      }
      lastQualityAppliedVideoId = videoId;
      console.log(`[Megabox Enhancer] Locked quality to ${target} for video ${videoId}`);
    } catch (_) {}
  }

  // 7. Audio Track Selector (Pilih Dubbing Indonesia atau Original)
  let lastAudioTrackAppliedVideoId = null;
  function enforceAudioTrackPreference() {
    if (!isEnhancerActive) return;
    const player = document.getElementById("movie_player");
    if (!player || typeof player.getAvailableAudioTracks !== "function") return;

    const videoId = player.getVideoData ? player.getVideoData()?.video_id : null;
    if (!videoId) return;

    if (lastAudioTrackAppliedVideoId === videoId) return;

    const tracks = player.getAvailableAudioTracks();
    if (!tracks || tracks.length <= 1) {
      lastAudioTrackAppliedVideoId = videoId;
      return;
    }

    if (prefPreferIndo) {
      // Prioritize Indonesian dubbing track
      const indoTrack = tracks.find(t => {
        const name = (t.Mb ? t.Mb.name : t.name) || "";
        return name.toLowerCase().includes("indonesia") || (t.id && t.id.includes("aWQ"));
      });
      if (indoTrack) {
        player.setAudioTrack(indoTrack);
        lastAudioTrackAppliedVideoId = videoId;
        console.log("[Megabox Enhancer] Set audio track to Indonesian dubbing");
        return;
      }
    } else {
      // Prioritize Original track
      const origTrack = tracks.find(t => {
        const name = (t.Mb ? t.Mb.name : t.name) || "";
        return (t.id && t.id.includes("original")) || name.toLowerCase().includes("asli");
      });
      if (origTrack) {
        player.setAudioTrack(origTrack);
        lastAudioTrackAppliedVideoId = videoId;
        console.log("[Megabox Enhancer] Set audio track to Original track");
        return;
      }
    }

    lastAudioTrackAppliedVideoId = videoId;
  }

  // 8. Auto Subtitle Indonesia Engine (Native & Auto-Translate ID)
  let lastSubAppliedVideoId = null;
  function enableSubtitlesOnPlayer(player) {
    const subBtn = document.querySelector(".ytp-subtitles-button");
    if (subBtn && subBtn.getAttribute("aria-pressed") !== "true") {
      subBtn.click();
    } else if (player && player.toggleSubtitlesOn && !player.isSubtitlesOn?.()) {
      player.toggleSubtitlesOn();
    }
  }

  function disableSubtitlesOnPlayer(player) {
    const subBtn = document.querySelector(".ytp-subtitles-button");
    if (subBtn && subBtn.getAttribute("aria-pressed") === "true") {
      subBtn.click();
    } else if (player) {
      player.setOption?.("captions", "track", {});
      if (player.toggleSubtitles && player.isSubtitlesOn?.()) player.toggleSubtitles();
    }
  }

  function applyIndonesianSubtitleTrack(player, isManualToggle = false) {
    if (!player || typeof player.setOption !== "function") return false;

    // Ensure YouTube's subtitle display engine is on
    enableSubtitlesOnPlayer(player);

    const tracklist = player.getOption("captions", "tracklist") || [];
    const transList = player.getOption("captions", "translationLanguages") || [];

    // 1. Direct native Indonesian subtitle track
    const nativeId = tracklist.find(t => t.languageCode === "id" || (t.languageName && t.languageName.toLowerCase().includes("indonesia")));
    if (nativeId) {
      player.setOption("captions", "track", nativeId);
      console.log("[Megabox Enhancer] Set subtitle to native Indonesian track");
      return true;
    }

    // 2. Auto-translate to Indonesian from base track
    const idTrans = transList.find(t => t.languageCode === "id");
    if (idTrans) {
      const baseTrack = tracklist.find(t => t.is_default && t.is_translateable) ||
                        tracklist.find(t => t.languageCode === "en") ||
                        tracklist.find(t => t.is_translateable) ||
                        tracklist[0];
      if (baseTrack) {
        player.setOption("captions", "track", {
          ...baseTrack,
          translationLanguage: idTrans
        });
        console.log("[Megabox Enhancer] Set subtitle to auto-translated Indonesian track from:", baseTrack.languageName);
        return true;
      }
    }

    // If tracklist is still empty, schedule delayed retry (YouTube lazy-loads tracklist on click)
    if (isManualToggle) {
      setTimeout(() => {
        applyIndonesianSubtitleTrack(player, false);
      }, 500);
    }
    return false;
  }

  function enforceSubtitleIndoPreference() {
    if (!isEnhancerActive) return;
    const player = document.getElementById("movie_player");
    if (!player || typeof player.setOption !== "function") return;

    const videoId = player.getVideoData ? player.getVideoData()?.video_id : null;
    if (!videoId) return;

    if (lastSubAppliedVideoId === videoId) return;

    if (!prefSubtitleIndo) {
      lastSubAppliedVideoId = videoId;
      return;
    }

    const applied = applyIndonesianSubtitleTrack(player, false);
    if (applied) {
      lastSubAppliedVideoId = videoId;
    }
  }

  // 9. Playback Speed Engine (Slow Down, Speed Up, Reset 1.0x)
  let speedPillLabel = null;
  function updateSpeedPillDisplay(rate) {
    if (!speedPillLabel) return;
    const formatted = (Math.round(rate * 100) / 100).toFixed(rate % 1 === 0 ? 1 : 2).replace(/\.00$/, ".0");
    speedPillLabel.textContent = formatted + "x";
    if (rate !== 1.0) {
      speedPillLabel.style.color = "#34C759";
    } else {
      speedPillLabel.style.color = "#FFFFFF";
    }
  }

  function setPlayerSpeedRelative(delta) {
    const player = document.getElementById("movie_player");
    const video = document.querySelector("video");
    if (!video) return;

    let current = video.playbackRate || 1.0;
    let target = Math.round((current + delta) * 100) / 100;
    target = Math.max(0.25, Math.min(4.0, target));

    if (player && player.setPlaybackRate) {
      player.setPlaybackRate(target);
    }
    video.playbackRate = target;
    updateSpeedPillDisplay(target);
    showEnhancerFeedback(`⚡ Kecepatan: ${target}x`);
  }

  function resetPlayerSpeedNormal() {
    const player = document.getElementById("movie_player");
    const video = document.querySelector("video");
    if (!video) return;

    if (player && player.setPlaybackRate) {
      player.setPlaybackRate(1.0);
    }
    video.playbackRate = 1.0;
    updateSpeedPillDisplay(1.0);
    showEnhancerFeedback("⚡ Kecepatan Normal: 1.0x");
  }

  // 10. Integrated Player Controls for Enhancer (Dubbing ID, Sub Indo, 1080p, Playback Speed)
  function injectEnhancerToolbar() {
    try {
      ensureEnhancerStyles();

      // Prioritize integrating directly into YouTube's native .ytp-right-controls
      const rightControls = document.querySelector(".ytp-right-controls-left") || document.querySelector(".ytp-right-controls");
      if (!rightControls) return;

      if (document.getElementById("megabox-enhancer-bar")) return;

      const bar = document.createElement("div");
      bar.id = "megabox-enhancer-bar";
      bar.style.cssText = `
        display: inline-flex;
        align-items: center;
        height: 100%;
        vertical-align: top;
        margin-right: 4px;
      `;

      function createYtpBtn(svgEl, title, onClick) {
        const btn = document.createElement("button");
        btn.className = "ytp-button";
        btn.title = title;
        btn.style.cssText = `
          width: 34px;
          height: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          margin: 0;
          outline: none;
          color: rgba(255, 255, 255, 0.75);
          transition: color 0.15s ease, transform 0.1s ease;
        `;
        btn.appendChild(svgEl);
        btn.onmouseenter = () => {
          if (!btn.dataset.active || btn.dataset.active === "false") {
            btn.style.color = "#FFFFFF";
          }
          btn.style.transform = "scale(1.08)";
        };
        btn.onmouseleave = () => {
          if (!btn.dataset.active || btn.dataset.active === "false") {
            btn.style.color = "rgba(255, 255, 255, 0.75)";
          }
          btn.style.transform = "scale(1)";
        };
        btn.onclick = onClick;
        return btn;
      }

      // 1. Audio Language Toggle (ID Dubbing <-> Original)
      const audioSvg = createSvgIcon("18", "18", "M3 5h12M9 3v2m1 14l-5-10h10l-5 10zm-1-4h2");
      const audioBtn = createYtpBtn(
        audioSvg,
        prefPreferIndo ? "Bahasa Audio: Dubbing Indo (Aktif - Klik ke Suara Asli)" : "Bahasa Audio: Suara Asli (Klik ke Dubbing Indo)",
        () => {
          prefPreferIndo = !prefPreferIndo;
          localStorage.setItem("mb_enhancer_prefer_indo", prefPreferIndo ? "true" : "false");
          audioBtn.title = prefPreferIndo ? "Bahasa Audio: Dubbing Indo (Aktif - Klik ke Suara Asli)" : "Bahasa Audio: Suara Asli (Klik ke Dubbing Indo)";
          audioBtn.style.color = prefPreferIndo ? "#34C759" : "rgba(255, 255, 255, 0.75)";
          audioBtn.dataset.active = prefPreferIndo ? "true" : "false";
          showEnhancerFeedback(prefPreferIndo ? "🇮🇩 Audio: Prioritas Dubbing Indo" : "🌐 Audio: Prioritas Suara Asli (Original)");
          lastAudioTrackAppliedVideoId = null;
          enforceAudioTrackPreference();
        }
      );
      if (prefPreferIndo) {
        audioBtn.style.color = "#34C759";
        audioBtn.dataset.active = "true";
      }
      bar.appendChild(audioBtn);

      // 2. Subtitle Indonesia Toggle (CC ID On <-> Off)
      const subSvg = createSvgIcon("18", "18", "M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm3 6h3M7 9h4M14 12h3M14 9h2");
      const subBtn = createYtpBtn(
        subSvg,
        prefSubtitleIndo ? "Subtitle: Indonesia Aktif (Klik matikan)" : "Subtitle: Indonesia Nonaktif (Klik aktifkan)",
        () => {
          prefSubtitleIndo = !prefSubtitleIndo;
          localStorage.setItem("mb_enhancer_sub_indo", prefSubtitleIndo ? "true" : "false");
          subBtn.title = prefSubtitleIndo ? "Subtitle: Indonesia Aktif (Klik matikan)" : "Subtitle: Indonesia Nonaktif (Klik aktifkan)";
          subBtn.style.color = prefSubtitleIndo ? "#FFCC00" : "rgba(255, 255, 255, 0.75)";
          subBtn.dataset.active = prefSubtitleIndo ? "true" : "false";

          const player = document.getElementById("movie_player");
          if (player) {
            if (prefSubtitleIndo) {
              lastSubAppliedVideoId = null;
              applyIndonesianSubtitleTrack(player, true);
              showEnhancerFeedback("💬 Subtitle: Bahasa Indonesia Aktif");
            } else {
              disableSubtitlesOnPlayer(player);
              showEnhancerFeedback("💬 Subtitle: Dimatikan");
            }
          }
        }
      );
      if (prefSubtitleIndo) {
        subBtn.style.color = "#FFCC00";
        subBtn.dataset.active = "true";
      }
      bar.appendChild(subBtn);

      // 3. Quality Lock Button (Cycle 1080p -> 720p -> 1440p)
      const qualitySvg = createSvgIcon("18", "18", "M4 6h16M4 12h16M4 18h7");
      const qualityBtn = createYtpBtn(
        qualitySvg,
        `Kunci Kualitas: ${prefQuality === "hd1080" ? "1080p HD" : prefQuality} (Klik ganti)`,
        () => {
          if (prefQuality === "hd1080") prefQuality = "hd720";
          else if (prefQuality === "hd720") prefQuality = "hd1440";
          else prefQuality = "hd1080";
          localStorage.setItem("mb_enhancer_quality", prefQuality);
          const label = prefQuality === "hd1080" ? "1080p HD" : (prefQuality === "hd720" ? "720p HD" : "1440p 2K");
          qualityBtn.title = `Kunci Kualitas: ${label} (Klik ganti)`;
          showEnhancerFeedback(`📺 Kunci Kualitas: ${label}`);
          lastQualityAppliedVideoId = null;
          enforceAutoQuality();
        }
      );
      qualityBtn.style.color = "#34C759";
      qualityBtn.dataset.active = "true";
      bar.appendChild(qualityBtn);

      // 4. Playback Speed Cluster Pill: Perlambat (-0.25x), Normal (1.0x), Percepat (+0.25x)
      const speedCluster = document.createElement("div");
      speedCluster.id = "mb-speed-cluster";
      speedCluster.style.cssText = `
        display: inline-flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 13px;
        height: 26px;
        margin: 0 4px;
        padding: 0 3px;
        box-sizing: border-box;
      `;

      function createClusterBtn(child, title, width, onClick) {
        const b = document.createElement("button");
        b.className = "ytp-button";
        b.title = title;
        b.style.cssText = `
          width: ${width};
          height: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          margin: 0;
          outline: none;
          color: rgba(255, 255, 255, 0.85);
          font-size: 11px;
          font-weight: 600;
          font-family: Roboto, Arial, sans-serif;
          transition: color 0.15s ease, transform 0.1s ease;
        `;
        if (typeof child === "string") {
          const span = document.createElement("span");
          span.textContent = child;
          b.appendChild(span);
        } else {
          b.appendChild(child);
        }
        b.onmouseenter = () => { b.style.color = "#FFFFFF"; b.style.transform = "scale(1.1)"; };
        b.onmouseleave = () => { b.style.color = "rgba(255, 255, 255, 0.85)"; b.style.transform = "scale(1)"; };
        b.onclick = onClick;
        return b;
      }

      // Slower (-0.25x)
      const slowerSvg = createSvgIcon("14", "14", "M11 19l-7-7 7-7m8 14l-7-7 7-7");
      speedCluster.appendChild(createClusterBtn(slowerSvg, "Perlambat (-0.25x)", "20px", () => setPlayerSpeedRelative(-0.25)));

      // Normal (1.0x) Reset
      const normalBtn = createClusterBtn("1.0x", "Kecepatan Normal (Klik untuk Reset ke 1.0x)", "30px", () => resetPlayerSpeedNormal());
      speedPillLabel = normalBtn.querySelector("span");
      speedCluster.appendChild(normalBtn);

      // Faster (+0.25x)
      const fasterSvg = createSvgIcon("14", "14", "M13 5l7 7-7 7M5 5l7 7-7 7");
      speedCluster.appendChild(createClusterBtn(fasterSvg, "Percepat (+0.25x)", "20px", () => setPlayerSpeedRelative(0.25)));

      // Sync initial video playback rate
      const curVideo = document.querySelector("video");
      if (curVideo && curVideo.playbackRate) {
        updateSpeedPillDisplay(curVideo.playbackRate);
      }

      bar.appendChild(speedCluster);

      // Insert cleanly before settings button or at front of controls
      const settingsBtn = rightControls.querySelector(".ytp-settings-button");
      if (settingsBtn) {
        rightControls.insertBefore(bar, settingsBtn);
      } else {
        rightControls.insertBefore(bar, rightControls.firstChild);
      }
      toolbarEl = bar;
    } catch (err) {
      console.error("[Megabox Enhancer] Error in injectEnhancerToolbar:", err);
    }
  }

  // Setup scroll observer once
  setupScrollPopupObserver();

  // Reset tracking on YouTube SPA navigation
  window.addEventListener("yt-navigate-finish", () => {
    lastQualityAppliedVideoId = null;
    lastAudioTrackAppliedVideoId = null;
    lastSubAppliedVideoId = null;
  });

  // Polling hook
  setInterval(() => {
    if (!isEnhancerActive) return;
        injectEnhancerToolbar();
    enforceAutoQuality();
    enforceAudioTrackPreference();
    enforceSubtitleIndoPreference();
  }, 1500);

  console.log("[Megabox Enhancer] YouTube Enhancer power-user engine active (Draggable Popup, Auto Quality, Audio & Subtitle Indo).");
})();

