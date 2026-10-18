const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { initDatabase, getApps, saveApp, deleteApp } = require('./db.js');
const { setupHeaderInterceptors, CHROME_UA } = require('./extensions.js');

let mainWindow = null;
let db = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Megabox',
    frame: true,
    backgroundColor: '#0F172A',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      webviewTag: true,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Setup interceptors for default session
  setupHeaderInterceptors(session.defaultSession);

  // Setup interceptor for any custom webview partition session
  app.on('session-created', (ses) => {
    setupHeaderInterceptors(ses);
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--test-exit')) {
    setTimeout(() => {
      console.log('Megabox test-exit flag received: shutting down cleanly.');
      app.exit(0);
    }, 2000);
  }
}

app.whenReady().then(() => {
  db = initDatabase();

  // IPC Handlers
  ipcMain.handle('apps:get', () => {
    return getApps(db);
  });

  ipcMain.handle('apps:save', (_, appData) => {
    saveApp(db, appData);
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

  ipcMain.on('window:minimize', () => mainWindow && mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window:close', () => mainWindow && mainWindow.close());

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
