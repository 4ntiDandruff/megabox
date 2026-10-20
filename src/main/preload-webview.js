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
// Simple Translate - Floating Instant Selection Translator Engine (IPC Relay)
// ============================================================================
(function initSimpleTranslate() {
  let tooltipEl = null;
  let currentSelectionText = "";
  let lastTranslateTimer = null;
  let activeRequestId = 0;

  function createTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.id = "megabox-simple-translate-panel";
    tooltipEl.style.cssText = [
      "position: absolute",
      "display: none",
      "z-index: 2147483647",
      "background: #151619",
      "color: #f1f5f9",
      "border: 1px solid #282a30",
      "border-radius: 9px",
      "box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7), 0 4px 12px rgba(0, 0, 0, 0.5)",
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      "font-size: 13px",
      "line-height: 1.5",
      "max-width: 380px",
      "min-width: 220px",
      "padding: 10px 14px",
      "user-select: text",
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

  // Listen to translation response sent back from renderer host
  ipcRenderer.on('translate:response', (_, data) => {
    if (!data || data.requestId !== activeRequestId || !tooltipEl) return;
    const res = data.result;

    if (res && res.success) {
      const source = (res.sourceLang || 'auto').toUpperCase();
      const target = (res.targetLang || 'id').toUpperCase();

      tooltipEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:6px; font-size:11px; color:#94a3b8; font-weight:600;">
          <span style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25); padding:1px 6px; border-radius:4px; text-transform:uppercase; font-size:10px; font-weight:700;">${source} → ${target}</span>
          <span style="font-size:11px; color:#64748b;">Terjemahan Instan</span>
          <div style="margin-left:auto; display:flex; align-items:center; gap:6px;">
            <button id="st-copy-btn" type="button" style="background:#22242a; border:1px solid #363942; border-radius:4px; color:#cbd5e1; cursor:pointer; font-size:11px; padding:2px 8px; font-weight:600; display:flex; align-items:center; gap:4px;">
              <span>Salin</span>
            </button>
            <span style="cursor:pointer; color:#94a3b8; font-size:16px; line-height:1; padding:0 2px;" id="st-close-btn">&times;</span>
          </div>
        </div>
        <div id="st-translated-text" style="font-size:13px; color:#f8fafc; font-weight:500; word-break:break-word; max-height:200px; overflow-y:auto; line-height:1.55;">
          ${res.translation}
        </div>
      `;

      const copyBtn = tooltipEl.querySelector('#st-copy-btn');
      if (copyBtn) {
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(res.translation).then(() => {
            copyBtn.innerHTML = '<span style="color:#22c55e;">Tersalin!</span>';
            setTimeout(() => {
              if (copyBtn) copyBtn.innerHTML = '<span>Salin</span>';
            }, 1500);
          }).catch(() => {});
        };
      }

      const closeBtn = tooltipEl.querySelector('#st-close-btn');
      if (closeBtn) closeBtn.onclick = hideTooltip;

    } else {
      tooltipEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:11px; color:#ef4444;">
          <span>Gagal menerjemahkan (${res ? res.error || 'Network error' : 'Error'})</span>
          <span style="cursor:pointer; color:#cbd5e1;" id="st-close-btn">&times;</span>
        </div>
      `;
      const closeBtn = tooltipEl.querySelector('#st-close-btn');
      if (closeBtn) closeBtn.onclick = hideTooltip;
    }
  });

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
          <span style="background:rgba(255,255,255,0.06); color:#cbd5e1; padding:1px 6px; border-radius:4px; font-size:10px;">AUTO-FLIP</span>
          <span>Menerjemahkan...</span>
          <span style="margin-left:auto; cursor:pointer; color:#94a3b8; font-size:16px; line-height:1;" id="st-close-btn">&times;</span>
        </div>
        <div style="font-size:12px; color:#64748b; font-style:italic;">Menghubungkan ke engine terjemahan...</div>
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

  console.log("[Megabox] Simple Translate selection observer mounted via IPC Relay.");
})();


// Flag preload loaded for health check
window.__megabox_preload_loaded = true;

// Megabox Webview Zoom Bridge (Ctrl + Wheel & IPC Sync with webFrame)
(function initWheelZoomBridge() {
  try {
    const { webFrame } = require("electron");

    window.__wheel_installed = true;

    // Sync zoom level from host renderer
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

    // Request available credentials for current domain on load
    function requestVaultCredentials() {
      const origin = window.location.href;
      ipcRenderer.sendToHost("megawarden:request-credentials", { url: origin });
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

    function showSuggestionDropdown(input) {
      removeDropdown();
      if (!cachedCredentials || cachedCredentials.length === 0) return;
      if (!input || !input.isConnected) return;

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
        width: ${Math.max(260, Math.min(360, elWidth))}px;
        background: #14161a;
        border: 1px solid #2d313a;
        border-radius: 10px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(56, 189, 248, 0.15);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f1f5f9;
        overflow: hidden;
        animation: mw-fade-in 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      // Header (100% Trusted Types safe without innerHTML)
      const header = document.createElement("div");
      header.style.cssText = `
        padding: 7px 12px;
        background: #181b22;
        border-bottom: 1px solid #242832;
        font-size: 11px;
        font-weight: 600;
        color: #38bdf8;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
      `;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "13");
      svg.setAttribute("height", "13");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "#38bdf8");
      svg.setAttribute("stroke-width", "2.2");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z");
      svg.appendChild(path);

      const titleSpan = document.createElement("span");
      titleSpan.textContent = "Megawarden Vault";

      const countSpan = document.createElement("span");
      countSpan.style.cssText = "margin-left: auto; font-size: 10px; color: #64748b; font-weight: 400;";
      countSpan.textContent = `${cachedCredentials.length} akun`;

      header.appendChild(svg);
      header.appendChild(titleSpan);
      header.appendChild(countSpan);
      dropdown.appendChild(header);

      // List container
      const list = document.createElement("div");
      list.style.cssText = "max-height: 200px; overflow-y: auto; padding: 4px;";

      cachedCredentials.slice(0, 6).forEach((cred, idx) => {
        const item = document.createElement("div");
        item.style.cssText = `
          padding: 8px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: background 0.12s ease;
        `;

        item.onmouseenter = () => { item.style.background = "rgba(56, 189, 248, 0.12)"; };
        item.onmouseleave = () => { item.style.background = "transparent"; };

        item.onmousedown = (e) => {
          e.preventDefault(); // Prevent input blur
          fillCredential(input, cred, isPassword);
          removeDropdown();
        };

        const iconBox = document.createElement("div");
        iconBox.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 5px;
          background: #1e222b;
          border: 1px solid #2f3542;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #38bdf8;
          font-weight: 700;
          font-size: 11px;
          flex-shrink: 0;
        `;
        iconBox.textContent = (cred.name || cred.username || "A").charAt(0).toUpperCase();

        const textCol = document.createElement("div");
        textCol.style.cssText = "min-width: 0; flex: 1;";

        const titleLine = document.createElement("div");
        titleLine.style.cssText = "font-size: 12px; font-weight: 500; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
        titleLine.textContent = cred.username || "(tanpa username)";

        const subLine = document.createElement("div");
        subLine.style.cssText = "font-size: 10.5px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
        subLine.textContent = cred.name ? `${cred.name} • ${cred.domain || ''}` : (cred.domain || 'Akun Tersimpan');

        textCol.appendChild(titleLine);
        textCol.appendChild(subLine);
        item.appendChild(iconBox);
        item.appendChild(textCol);
        list.appendChild(item);
      });

      dropdown.appendChild(list);
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

        ipcRenderer.sendToHost("megawarden:save-prompt", {
          url,
          title,
          username: username.trim(),
          password: password
        });
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
