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
