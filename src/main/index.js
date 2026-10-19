const { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { initDatabase, getApps, saveApp, deleteApp, reorderApp } = require('./db.js');
const { setupHeaderInterceptors } = require('./extensions.js');
const sync = require('./sync-client.js');
const extensionsManager = require('./extensions-manager.js');
const fs = require('fs');

function checkGpuCacheConsistency() {
  try {
    const configDir = path.join(app.getPath('userData'));
    const gpuHashFile = path.join(configDir, 'gpu_version_hash.txt');
    const gpuCacheDir = path.join(configDir, 'GPUCache');
    
    // Read current Mesa / Linux GPU release fingerprint
    let currentHash = 'unknown';
    try {
      const releaseInfo = fs.readFileSync('/proc/version', 'utf8');
      currentHash = releaseInfo.split(' ').slice(0, 4).join('_');
    } catch (_) {}

    let previousHash = '';
    if (fs.existsSync(gpuHashFile)) {
      previousHash = fs.readFileSync(gpuHashFile, 'utf8').trim();
    }

    if (currentHash !== previousHash && fs.existsSync(gpuCacheDir)) {
      console.log('[Wayland GPU Guard] Kernel/Mesa updated. Flushing stale GPUCache to prevent shader deadlock...');
      fs.rmSync(gpuCacheDir, { recursive: true, force: true });
    }
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(gpuHashFile, currentHash);
  } catch (err) {
    console.warn('[Wayland GPU Guard] Non-critical check error:', err.message);
  }
}

let mainWindow = null;
let tray = null;
let db = null;
let isQuitting = false;
let syncDebounceTimer = null;

function triggerAutoSync() {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(async () => {
    try {
      const apps = getApps(db);
      const res = await sync.pushWorkspace(apps);
      if (!res.skipped) {
        console.log('[AutoSync] Workspace synced to cloud successfully:', res.version_hash);
        if (mainWindow) {
          mainWindow.webContents.send('sync:status-updated', sync.getSyncStatus());
        }
      }
    } catch (err) {
      console.warn('[AutoSync] Cloud sync skipped/failed (offline-first):', err.message);
    }
  }, 3000); // Debounce 3 detik
}

function createTray() {
  const iconPath = path.join(__dirname, '../renderer/assets/megabox.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Megabox - Zero Bloat Multi-App Workspace');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Megabox',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Reload Active Service',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('action:reload');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Megabox',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    }
  });
}

function createWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    show: true,
    autoHideMenuBar: true,
    title: 'Megabox',
    icon: path.join(__dirname, '../renderer/assets/megabox.png'),
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (line ${line})`);
  });

  setupHeaderInterceptors(session.defaultSession);
  app.on('session-created', (ses) => {
    setupHeaderInterceptors(ses);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Expose CLI trigger to pop window to front if it goes behind
  ipcMain.handle('window:focus', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      return true;
    }
    return false;
  });

  // Keep window visible and prevent accidental minimize on startup
  mainWindow.on('minimize', (e) => {
    console.log('[Megabox Window] Window minimized by system/user');
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

app.whenReady().then(() => {
  checkGpuCacheConsistency();
  db = initDatabase();

  // Initial cloud sync pull if logged in
  const status = sync.getSyncStatus();
  if (status.logged_in) {
    sync.pullWorkspace().then(res => {
      if (res.exists && res.layout && res.layout.services && res.layout.services.length > 0) {
        console.log('[Sync Startup] Applying cloud workspace layout...');
        const currentData = db.read();
        currentData.apps = res.layout.services.map((s, idx) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          icon: s.icon || 'globe',
          custom_icon: s.custom_icon || null,
          partition: 'persist:' + s.id,
          order_index: s.order_index !== undefined ? s.order_index : idx,
          is_enabled: 1,
          proxy: s.proxy || ''
        }));
        db.write(currentData);
        if (mainWindow) {
          mainWindow.webContents.send('apps:updated', getApps(db));
        }
      }
    }).catch(err => {
      console.warn('[Sync Startup] Pull skipped/failed:', err.message);
    });
  }

    // Non-blocking Wayland Notification Relay with 500ms Circuit Breaker
  ipcMain.handle('notify:dispatch', async (_, { title, body, icon }) => {
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('[Wayland D-Bus Circuit] Notification timed out (500ms). Bypassing to prevent UI freeze.');
          resolve({ delivered: false, reason: 'timeout' });
        }
      }, 500);

      try {
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
          const notif = new Notification({
            title: title || 'Megabox',
            body: body || '',
            icon: icon || path.join(__dirname, '../renderer/assets/megabox.png'),
            silent: false
          });
          notif.show();
        }
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ delivered: true });
        }
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve({ delivered: false, error: e.message });
        }
      }
    });
  });

  // Extensions Management IPC handlers
  ipcMain.handle('extensions:get-catalog', () => {
    return extensionsManager.getCatalog();
  });

  ipcMain.handle('extensions:toggle', async (_, { appId, extensionId, enabled }) => {
    console.log(`[Megabox IPC] Extension toggle: ${extensionId} for ${appId} -> ${enabled}`);
    return { success: true, appId, extensionId, enabled };
  });


async function resolveFaviconForUrl(targetUrl) {
  if (!targetUrl || typeof targetUrl !== 'string') return null;
  let domain = '';
  let origin = '';
  try {
    const u = new URL(targetUrl.startsWith('http') ? targetUrl : ('https://' + targetUrl));
    domain = u.hostname;
    origin = u.origin;
  } catch (_) {
    return null;
  }

  const candidates = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `${origin}/favicon.ico`,
    `${origin}/apple-touch-icon.png`
  ];

  for (const favUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resp = await fetch(favUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 Megabox Favicon' }
      });
      clearTimeout(timeoutId);
      if (resp.ok) {
        const ct = resp.headers.get('content-type') || 'image/png';
        const arrayBuf = await resp.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        if (buf.length > 100 && buf.length <= 1500000) {
          return 'data:' + ct + ';base64,' + buf.toString('base64');
        }
      }
    } catch (_) {}
  }
  return null;
}

async function cacheFaviconToDataUri(iconUrl) {
  if (!iconUrl || typeof iconUrl !== 'string') return null;
  if (iconUrl.startsWith('data:')) return iconUrl;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const resp = await fetch(iconUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 Megabox Favicon' }
    });
    clearTimeout(timeoutId);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || 'image/png';
    const arrayBuf = await resp.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    if (buf.length > 0 && buf.length <= 1500000) {
      return 'data:' + ct + ';base64,' + buf.toString('base64');
    }
  } catch (err) {
    console.warn('[FaviconCache] Fetch failed:', err.message);
  }
  return null;
}

  ipcMain.handle('apps:cache-favicon', async (_, { appId, iconUrl }) => {
    const dataUri = await cacheFaviconToDataUri(iconUrl);
    if (dataUri) {
      const appItem = getApps(db).find(a => a.id === appId);
      if (appItem && appItem.custom_icon !== dataUri) {
        appItem.custom_icon = dataUri;
        saveApp(db, appItem);
        mainWindow.webContents.send('apps:updated', getApps(db));
        triggerAutoSync();
      }
      return { success: true, dataUri };
    }
    return { success: false };
  });

  ipcMain.handle('apps:get', () => {
    const list = getApps(db);
    return list;
  });

  ipcMain.handle('apps:save', async (_, appData) => {
    // Auto-generate favicon for custom services if not yet cached
    if ((!appData.custom_icon || !appData.custom_icon.startsWith('data:')) && (!appData.icon || appData.icon === 'custom' || appData.icon === 'globe' || appData.icon === 'web')) {
      try {
        const autoFav = await resolveFaviconForUrl(appData.url);
        if (autoFav) {
          appData.custom_icon = autoFav;
          console.log(`[Favicon] Auto-generated and cached favicon for ${appData.name}`);
        }
      } catch (err) {
        console.warn('[Favicon Auto-Gen Failed]', err.message);
      }
    }
    saveApp(db, appData);
    if (appData.id && appData.proxy) {
      try {
        const ses = session.fromPartition(`persist:service_${appData.id}`);
        ses.setProxy({ proxyRules: appData.proxy }).then(() => {
          console.log(`[Proxy] Applied proxy ${appData.proxy} to service ${appData.id}`);
        }).catch(err => {
          console.error(`[Proxy Error] Failed to set proxy for ${appData.id}:`, err);
        });
      } catch (e) {
        console.error('[Proxy Error]', e);
      }
    }
    const updated = getApps(db);
    mainWindow.webContents.send('apps:updated', updated);
    triggerAutoSync();
    return true;
  });

  ipcMain.handle('apps:delete', (_, id) => {
    deleteApp(db, id);
    const updated = getApps(db);
    mainWindow.webContents.send('apps:updated', updated);
    triggerAutoSync();
    return true;
  });

  ipcMain.handle('apps:reorder', (_, { id, dir }) => {
    reorderApp(db, id, dir);
    const updated = getApps(db);
    mainWindow.webContents.send('apps:updated', updated);
    triggerAutoSync();
    return updated;
  });


  ipcMain.handle('service:set-proxy', async (_, { serviceId, proxyRules }) => {
    try {
      const ses = session.fromPartition(`persist:service_${serviceId}`);
      await ses.setProxy({ proxyRules: proxyRules || '' });
      console.log(`[Proxy] Dynamic proxy update for ${serviceId}: ${proxyRules || 'DIRECT'}`);
      return { success: true };
    } catch (err) {
      console.error(`[Proxy Error] Dynamic setProxy failed:`, err);
      return { success: false, error: err.message };
    }
  });

  // Cloud Sync IPC Handlers
  ipcMain.handle('sync:get-status', () => {
    return sync.getSyncStatus();
  });

  ipcMain.handle('sync:login', async (_, { email, password }) => {
    try {
      const res = await sync.login(email, password);
      // Immediately pull upon login
      const pullRes = await sync.pullWorkspace();
      if (pullRes.exists && pullRes.layout && pullRes.layout.services && pullRes.layout.services.length > 0) {
        const currentData = db.read();
        currentData.apps = pullRes.layout.services.map((s, idx) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          icon: s.icon || 'globe',
          custom_icon: s.custom_icon || null,
          partition: 'persist:' + s.id,
          order_index: s.order_index !== undefined ? s.order_index : idx,
          is_enabled: 1,
          proxy: s.proxy || ''
        }));
        db.write(currentData);
        mainWindow.webContents.send('apps:updated', getApps(db));
      } else {
        // First time cloud user -> push local apps to cloud
        await sync.pushWorkspace(getApps(db));
      }
      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:register', async (_, { email, password }) => {
    try {
      const res = await sync.register(email, password);
      // Immediately push local apps to new cloud account
      await sync.pushWorkspace(getApps(db));
      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:logout', async () => {
    await sync.logout();
    return { success: true };
  });

  ipcMain.handle('sync:manual-push', async () => {
    try {
      const res = await sync.pushWorkspace(getApps(db));
      return { success: true, data: res };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:manual-pull', async () => {
    try {
      const res = await sync.pullWorkspace();
      if (res.exists && res.layout && res.layout.services) {
        const currentData = db.read();
        currentData.apps = res.layout.services.map((s, idx) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          icon: s.icon || 'globe',
          custom_icon: s.custom_icon || null,
          partition: 'persist:' + s.id,
          order_index: s.order_index !== undefined ? s.order_index : idx,
          is_enabled: 1,
          proxy: s.proxy || ''
        }));
        db.write(currentData);
        mainWindow.webContents.send('apps:updated', getApps(db));
        return { success: true, count: res.layout.services.length };
      }
      return { success: false, error: 'Belum ada data workspace di cloud' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });


  // Universal Keyboard Shortcut Interceptor for Main Window and all Guest Webviews
  function handleInputShortcut(input) {
    if (input.type !== "keyDown") return null;
    const isCtrl = Boolean(input.control || input.meta);
    const isAlt = Boolean(input.alt);
    const isShift = Boolean(input.shift);
    const key = input.key;

    // Alt + 1..9 (Switch tab directly)
    if (isAlt && !isCtrl && !isShift && key >= "1" && key <= "9") {
      return { action: "switch-tab", index: parseInt(key, 10) - 1 };
    }
    // Alt + ArrowUp / Up (Pindah Naik)
    if (isAlt && !isCtrl && !isShift && (key === "ArrowUp" || key === "Up")) {
      return { action: "reorder-active-app", dir: "up" };
    }
    // Alt + ArrowDown / Down (Pindah Turun)
    if (isAlt && !isCtrl && !isShift && (key === "ArrowDown" || key === "Down")) {
      return { action: "reorder-active-app", dir: "down" };
    }
    // Alt + ArrowLeft / Left (Kembali)
    if (isAlt && !isCtrl && !isShift && (key === "ArrowLeft" || key === "Left")) {
      return { action: "nav-history", dir: "back" };
    }
    // Alt + ArrowRight / Right (Maju)
    if (isAlt && !isCtrl && !isShift && (key === "ArrowRight" || key === "Right")) {
      return { action: "nav-history", dir: "forward" };
    }
    // Ctrl + R / F5 (Muat Ulang Layanan)
    if ((isCtrl && !isAlt && (key === "r" || key === "R")) || key === "F5") {
      return { action: "reload-active" };
    }
    // Ctrl + K / Ctrl + P (Quick Switcher)
    if (isCtrl && !isAlt && (key === "k" || key === "K" || key === "p" || key === "P")) {
      return { action: "quick-switch" };
    }
    // Ctrl + N (Tambah Layanan / Katalog)
    if (isCtrl && !isAlt && (key === "n" || key === "N")) {
      return { action: "open-catalog" };
    }
    // Alt + Shift + D (Toggle DND)
    if (isAlt && isShift && !isCtrl && (key === "D" || key === "d")) {
      return { action: "toggle-dnd" };
    }
    // Alt + E (Toggle Extension Drawer)
    if (isAlt && !isShift && !isCtrl && (key === "e" || key === "E")) {
      return { action: "toggle-extensions" };
    }
    // Alt + S (Toggle Split Screen 1x2, disambiguated from Alt+2)
    if (isAlt && !isCtrl && (key === "s" || key === "S")) {
      return { action: "toggle-split" };
    }
    // Escape (Close Dialogs / Drawers / Context Menu)
    if (key === "Escape") {
      return { action: "escape" };
    }
    return null;
  }

  app.on("web-contents-created", (event, contents) => {
    contents.on("before-input-event", (e, input) => {
      const match = handleInputShortcut(input);
      if (match && mainWindow && !mainWindow.isDestroyed()) {
        e.preventDefault();
        mainWindow.webContents.send("shortcut:action", match);
      }
    });
  });

  createWindow();
  createTray();

  app.on('activate', () => {
    if (mainWindow) mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});
