const { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { initDatabase, getApps, saveApp, deleteApp } = require('./db.js');
const { setupHeaderInterceptors } = require('./extensions.js');
const sync = require('./sync-client.js');

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
    height: 800,
    minWidth: 800,
    minHeight: 600,
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

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

app.whenReady().then(() => {
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

  ipcMain.handle('apps:get', () => {
    const list = getApps(db);
    return list;
  });

  ipcMain.handle('apps:save', (_, appData) => {
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

  createWindow();
  createTray();

  app.on('activate', () => {
    if (mainWindow) mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});
