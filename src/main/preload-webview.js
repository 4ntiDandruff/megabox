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
// Simple Translate - Floating Instant Selection Translator Engine
// ============================================================================
(function initSimpleTranslate() {
  let tooltipEl = null;
  let currentSelectionText = "";
  let lastTranslateTimer = null;

  function createTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.id = "megabox-simple-translate-panel";
    tooltipEl.style.cssText = [
      "position: absolute",
      "display: none",
      "z-index: 2147483647",
      "background: #1e1e1e",
      "color: #f1f5f9",
      "border: 1px solid rgba(255, 255, 255, 0.15)",
      "border-radius: 8px",
      "box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
      "font-family: -apple-system, BlinkMacSystemFont, \x27Segoe UI\x27, Roboto, Helvetica, Arial, sans-serif",
      "font-size: 13px",
      "line-height: 1.5",
      "max-width: 360px",
      "min-width: 200px",
      "padding: 10px 14px",
      "user-select: text",
      "transition: opacity 0.15s ease",
      "box-sizing: border-box"
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

  async function fetchTranslation(text, targetLang = "id") {
    try {
      const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + encodeURIComponent(targetLang) + "&dt=t&q=" + encodeURIComponent(text);
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const translation = (data && data[0] && data[0][0] && data[0][0][0]) ? data[0].map(item => item[0]).join("") : "(Tidak ada terjemahan)";
      return {
        success: true,
        translation: translation,
        sourceLang: (data && data[2]) ? data[2] : "auto"
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function handleSelection() {
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
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px; font-size:11px; color:#94a3b8; font-weight:600;">
          <img src="https://translate.google.com/favicon.ico" style="width:14px; height:14px; border-radius:2px;" onerror="this.style.display=\x27none\x27">
          <span>Simple Translate (ID)</span>
          <span style="margin-left:auto; cursor:pointer; color:#cbd5e1; font-weight:bold; font-size:14px;" id="st-close-btn">&times;</span>
        </div>
        <div style="font-size:12px; color:#94a3b8; font-style:italic;">Menerjemahkan...</div>
      `;

      // Position tooltip safely within viewport
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      let topPos = rect.bottom + scrollTop + 8;
      let leftPos = rect.left + scrollLeft;

      if (leftPos + 340 > window.innerWidth + scrollLeft) {
        leftPos = Math.max(10, window.innerWidth + scrollLeft - 350);
      }
      panel.style.top = topPos + "px";
      panel.style.left = leftPos + "px";

      const closeBtn = panel.querySelector("#st-close-btn");
      if (closeBtn) closeBtn.onclick = hideTooltip;

      if (lastTranslateTimer) clearTimeout(lastTranslateTimer);
      lastTranslateTimer = setTimeout(async () => {
        const res = await fetchTranslation(text, "id");
        if (sel.toString().trim() !== text) return; // Discard if selection changed
        
        if (res.success) {
          panel.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:4px; font-size:11px; color:#94a3b8; font-weight:600;">
              <span style="background:rgba(99,102,241,0.2); color:#a5b4fc; padding:1px 6px; border-radius:4px; text-transform:uppercase; font-size:10px;">\${res.sourceLang} → ID</span>
              <span style="margin-left:auto; cursor:pointer; color:#cbd5e1; font-size:14px;" id="st-close-btn">&times;</span>
            </div>
            <div style="font-size:13px; color:#f8fafc; font-weight:500; word-break:break-word; max-height:180px; overflow-y:auto;">
              \${res.translation}
            </div>
          `;
          const btn = panel.querySelector("#st-close-btn");
          if (btn) btn.onclick = hideTooltip;
        } else {
          panel.innerHTML = `
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:#ef4444;">
              <span>Gagal menerjemahkan</span>
              <span style="cursor:pointer; color:#cbd5e1;" id="st-close-btn">&times;</span>
            </div>
          `;
          const btn = panel.querySelector("#st-close-btn");
          if (btn) btn.onclick = hideTooltip;
        }
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

  console.log("[Megabox] Simple Translate selection observer mounted.");
})();
