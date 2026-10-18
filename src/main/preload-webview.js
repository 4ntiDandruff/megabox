// Reverse-engineered from Rambox .vite/build/injected.js
const { ipcRenderer } = require('electron');

// 1. WebAuthn U2F protection timeout (fix Electron initial WebAuthn freeze)
(function blockCredentialsGet(blockTimeMs = 5000) {
  if (!navigator.credentials || !navigator.credentials.get) return;
  const ORIGINAL_CREDENTIALS_GET = navigator.credentials.get.bind(navigator.credentials);
  const loadTime = Date.now();

  navigator.credentials.get = async (...args) => {
    if (Date.now() - loadTime < blockTimeMs) {
      console.warn('[Megabox] navigator.credentials.get throttled during initial load.');
      return Promise.reject(new Error('WebAuthn request temporarily blocked.'));
    }
    return ORIGINAL_CREDENTIALS_GET(...args);
  };
})(5000);

// 2. Desktop Notification & Badge Bridge
(function bridgeNotifications() {
  const OriginalNotification = window.Notification;

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
// Megabox Unified Recipe Engine (Absorbed from Ferdium Open-Source Recipes)
// Injected into webviews to provide accurate IndexedDB WhatsApp badges, Telegram WebZ/WebK selectors, & darkmode
(function() {
  const { ipcRenderer } = require('electron');

  // Ferdium Bridge Shim
  window.Ferdium = {
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
      cb(true); // Always enforce dark mode integration
    },
    releaseServiceWorkers: () => {},
    setDialogTitle: (title) => {},
    isImage: () => false,
    openNewWindow: (url) => window.open(url, '_blank')
  };

  // 1. WhatsApp Native IndexedDB Unread Counter (Direct from Ferdium WhatsApp recipe)
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
            window.Ferdium.setBadge(unreadCount);
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

  // 2. Telegram WebZ & WebK Counter (Direct from Ferdium Telegram recipe)
  if (window.location.hostname.includes('web.telegram.org')) {
    const checkTelegram = () => {
      let count = 0;
      // WebZ
      document.querySelectorAll('.chat-list .ListItem.private .ChatBadge.unread:not(.muted), .chat-list .ListItem.group .ChatBadge.unread:not(.muted)').forEach(el => {
        count += window.Ferdium.safeParseInt(el.textContent);
      });
      // WebK
      document.querySelectorAll('.rp:not(.is-muted) .dialog-subtitle-badge').forEach(el => {
        count += window.Ferdium.safeParseInt(el.textContent);
      });
      if (count > 0) {
        window.Ferdium.setBadge(count);
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
      window.Ferdium.setBadge(count);
    }
  };
  setInterval(observeTitle, 2000);

  console.log('[Megabox] Ferdium Recipe & Service Shield injected successfully.');
})();
