const { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { initDatabase, getApps, saveApp, deleteApp } = require('./db.js');
const { setupHeaderInterceptors } = require('./extensions.js');

let mainWindow = null;
let tray = null;
let db = null;
let isQuitting = false;

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
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
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

  // Forward renderer console to terminal stdout for transparent debugging
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (line ${line})`);
  });

  // Intercept header & user-agent
  setupHeaderInterceptors(session.defaultSession);
  app.on('session-created', (ses) => {
    setupHeaderInterceptors(ses);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Close to Tray behavior (Identical to Rambox)
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

  ipcMain.handle('apps:get', () => {
    const list = getApps(db);
    console.log('[IPC Main] apps:get returned', list.length, 'apps');
    return list;
  });

  ipcMain.handle('apps:save', (_, appData) => {
    saveApp(db, appData);
    // If proxy configured, apply immediately to this service's partition
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
    return true;
  });

  ipcMain.handle('apps:delete', (_, id) => {
    deleteApp(db, id);
    const updated = getApps(db);
    mainWindow.webContents.send('apps:updated', updated);
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

  createWindow();
  createTray();

  app.on('activate', () => {
    if (mainWindow) mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});
