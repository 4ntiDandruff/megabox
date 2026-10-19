const { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { initDatabase, getApps, saveApp, deleteApp, reorderApp, getSettings, saveSettings } = require('./db.js');
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
  // Offline & Local-First: cloud auto-push dinonaktifkan demi privasi lokal
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
      const currentSettings = db ? getSettings(db) : { close_to_tray: true };
      if (currentSettings.close_to_tray !== false) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
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
      if (res.exists && res.layout) {
        const currentData = db.read();
        if (res.layout.services && res.layout.services.length > 0) {
          console.log('[Sync Startup] Applying cloud workspace layout...');
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
        }
        if (res.layout.settings && typeof res.layout.settings === 'object') {
          console.log('[Sync Startup] Applying cloud system settings...');
          currentData.settings = Object.assign({}, currentData.settings || {}, res.layout.settings);
        }
        db.write(currentData);
        if (mainWindow) {
          mainWindow.webContents.send('apps:updated', getApps(db));
          mainWindow.webContents.send('settings:updated', getSettings(db));
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

  // Local-First JSON Backup Handlers
  ipcMain.handle('backup:export', async () => {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const defaultFileName = `megabox-backup-${dateStr}.json`;
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Ekspor Cadangan Konfigurasi Megabox',
        defaultPath: path.join(app.getPath('downloads'), defaultFileName),
        filters: [{ name: 'JSON Backup', extensions: ['json'] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const backupData = {
        app_name: 'Megabox Workspace',
        version: 1,
        exported_at: new Date().toISOString(),
        apps: getApps(db),
        settings: getSettings(db)
      };

      const tmpPath = filePath + '.tmp';
      fs.writeFileSync(tmpPath, JSON.stringify(backupData, null, 2), 'utf-8');
      fs.renameSync(tmpPath, filePath);

      return { success: true, filePath, count: backupData.apps.length };
    } catch (err) {
      console.error('[Backup Export Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('backup:import', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Pilih File Cadangan Megabox (.json)',
        filters: [{ name: 'JSON Backup', extensions: ['json'] }],
        properties: ['openFile']
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = filePaths[0];
      const raw = fs.readFileSync(filePath, 'utf-8');
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return { success: false, error: 'File bukan format JSON yang valid.' };
      }

      if (!parsed || !Array.isArray(parsed.apps)) {
        return { success: false, error: 'Struktur cadangan tidak cocok (properti apps tidak ditemukan).' };
      }

      const currentData = db.read();
      currentData.apps = parsed.apps.map((s, idx) => ({
        id: s.id || ('app_' + Date.now() + '_' + idx),
        name: s.name || 'Untitled Service',
        url: s.url || 'about:blank',
        icon: s.icon || 'globe',
        custom_icon: s.custom_icon || null,
        partition: s.partition || ('persist:' + (s.id || idx)),
        order_index: s.order_index !== undefined ? s.order_index : idx,
        is_enabled: s.is_enabled !== undefined ? s.is_enabled : 1,
        proxy: s.proxy || ''
      }));

      if (parsed.settings && typeof parsed.settings === 'object') {
        currentData.settings = Object.assign({}, currentData.settings || {}, parsed.settings);
      }

      db.write(currentData);
      mainWindow.webContents.send('apps:updated', getApps(db));
      mainWindow.webContents.send('settings:updated', getSettings(db));

      return { success: true, count: currentData.apps.length, filePath };
    } catch (err) {
      console.error('[Backup Import Error]', err);
      return { success: false, error: err.message };
    }
  });

  // Cloud Sync IPC Handlers
  ipcMain.handle('sync:get-status', async () => {
    if (sync.refreshUserProfile) await sync.refreshUserProfile();
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
        await sync.pushWorkspace(getApps(db), getSettings(db));
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
      await sync.pushWorkspace(getApps(db), getSettings(db));
      return { success: true, user: res.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:logout', async () => {
    await sync.logout();
    return { success: true };
  });

    ipcMain.handle('sync:now', async () => {
    try {
      const pullRes = await sync.pullWorkspace();
      let restoredCount = 0;
      if (pullRes.exists && pullRes.layout) {
        const currentData = db.read();
        if (pullRes.layout.services && pullRes.layout.services.length > 0) {
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
          restoredCount = currentData.apps.length;
        }
        if (pullRes.layout.settings && typeof pullRes.layout.settings === 'object') {
          currentData.settings = Object.assign({}, currentData.settings || {}, pullRes.layout.settings);
        }
        db.write(currentData);
        mainWindow.webContents.send('apps:updated', getApps(db));
        mainWindow.webContents.send('settings:updated', getSettings(db));
      }
      
      // Always backup current local state to cloud
      const pushRes = await sync.pushWorkspace(getApps(db), getSettings(db));
      if (mainWindow) {
        mainWindow.webContents.send('sync:status-updated', sync.getSyncStatus());
      }
      return { 
        success: true, 
        count: restoredCount || getApps(db).length,
        version_hash: pushRes.version_hash
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // System Settings IPC Handlers
  ipcMain.handle('settings:get', () => {
    return getSettings(db);
  });

  ipcMain.handle('settings:save', (_, newSettings) => {
    const updated = saveSettings(db, newSettings);
    // Apply autostart if toggled
    triggerAutoSync();
    if (typeof newSettings.autostart === 'boolean') {
      try {
        app.setLoginItemSettings({
          openAtLogin: newSettings.autostart,
          path: process.execPath,
          args: [path.join(__dirname, '../../')]
        });
      } catch (err) {
        console.warn('[Autostart] setLoginItemSettings error:', err.message);
      }
    }
    return updated;
  });

  ipcMain.handle('system:clear-cache', async () => {
    try {
      if (session.defaultSession) {
        await session.defaultSession.clearCache();
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
