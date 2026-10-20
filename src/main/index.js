const { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const path = require('path');
const { initDatabase, getApps, saveApp, deleteApp, reorderApp, getSettings, saveSettings } = require('./db.js');
const { setupHeaderInterceptors } = require('./extensions.js');
const { translateText } = require('./translator.js');
const { initUpdater } = require('./updater.js');
const { MegawardenVault } = require('./megawarden.js');
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
let megawarden = null;
let isQuitting = false;
// Local-First architecture: fully offline, zero cloud overhead

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
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (line ${line})`);
  });

  // Global window before-input-event (ensures shortcuts work when main window / sidebar / tabs are focused)
  mainWindow.webContents.on('before-input-event', (inputEvent, input) => {
    if (input.type !== 'keyDown') return;
    const isCtrl = input.control || input.meta;
    const isShift = input.shift;

    if (isCtrl && !input.alt && (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd' || input.code === 'Equal')) {
      inputEvent.preventDefault();
      mainWindow.webContents.send('shortcut:action', { action: 'zoom-in' });
      return;
    }
    if (isCtrl && !input.alt && (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract' || input.code === 'Minus')) {
      inputEvent.preventDefault();
      mainWindow.webContents.send('shortcut:action', { action: 'zoom-out' });
      return;
    }
    if (isCtrl && !input.alt && !isShift && (input.key === '0' || input.code === 'Numpad0' || input.code === 'Digit0')) {
      inputEvent.preventDefault();
      mainWindow.webContents.send('shortcut:action', { action: 'zoom-reset' });
      return;
    }
    if (isCtrl && isShift && !input.alt && (input.key === 'L' || input.key === 'l')) {
      inputEvent.preventDefault();
            return;
    }
  });

  setupHeaderInterceptors(session.defaultSession);
  app.on('session-created', (ses) => {
    setupHeaderInterceptors(ses);
  });

  // Webview WebContents Attachment Hook (Workaround for Electron #40674 & Intercepting Shortcuts)
  mainWindow.webContents.on('did-attach-webview', (event, webviewWebContents) => {
    webviewWebContents.on('before-input-event', (inputEvent, input) => {
      if (input.type !== 'keyDown') return;
      const isCtrl = input.control || input.meta;
      const isShift = input.shift;

      // Zoom In: Ctrl + Plus, Ctrl + Shift + Equal, Ctrl + Equal
      if (isCtrl && !input.alt && (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd' || input.code === 'Equal')) {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'zoom-in' });
        return;
      }
      // Zoom Out: Ctrl + Minus, Ctrl + Shift + Minus, NumpadSubtract
      if (isCtrl && !input.alt && (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract' || input.code === 'Minus')) {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'zoom-out' });
        return;
      }
      // Zoom Reset: Ctrl + 0, Numpad0
      if (isCtrl && !input.alt && !isShift && (input.key === '0' || input.code === 'Numpad0' || input.code === 'Digit0')) {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'zoom-reset' });
        return;
      }
      // Quick Switcher: Ctrl + K or Ctrl + P
      if (isCtrl && !input.alt && !isShift && (input.key === 'k' || input.key === 'K' || input.key === 'p' || input.key === 'P')) {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'quick-switch' });
        return;
      }
      // Open Catalog: Ctrl + N
      if (isCtrl && !input.alt && !isShift && (input.key === 'n' || input.key === 'N')) {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'open-catalog' });
        return;
      }
      // Reload: Ctrl + R or F5
      if ((isCtrl && !input.alt && (input.key === 'r' || input.key === 'R')) || input.key === 'F5') {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'reload-active' });
        return;
      }
      // Tab Switching: Alt + 1..9
      if (input.alt && !isCtrl && !isShift && input.key >= '1' && input.key <= '9') {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'switch-tab', index: parseInt(input.key, 10) - 1 });
        return;
      }
      // Reorder Tabs: Alt + Up / Alt + Down
      if (input.alt && !isCtrl && !isShift && (input.key === 'ArrowUp' || input.key === 'Up')) {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'reorder-active-app', dir: 'up' });
        return;
      }
      if (input.alt && !isCtrl && !isShift && (input.key === 'ArrowDown' || input.key === 'Down')) {
        inputEvent.preventDefault();
        mainWindow.webContents.send('shortcut:action', { action: 'reorder-active-app', dir: 'down' });
        return;
      }
      // Escape
      if (input.key === 'Escape') {
        mainWindow.webContents.send('shortcut:action', { action: 'escape' });
      }
    });
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
  megawarden = new MegawardenVault(() => getSettings(db));

  // Local-First architecture: configuration loaded exclusively from local storage

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



  
  // Instant Selection Translation Relay (Zero-CSP Node.js Engine)
  ipcMain.handle('translate:perform', async (_, { text }) => {
    return await translateText(text);
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
    return true;
  });

  ipcMain.handle('apps:delete', (_, id) => {
    deleteApp(db, id);
    const updated = getApps(db);
    mainWindow.webContents.send('apps:updated', updated);
    return true;
  });

  ipcMain.handle('apps:reorder', (_, { id, dir }) => {
    reorderApp(db, id, dir);
    const updated = getApps(db);
    mainWindow.webContents.send('apps:updated', updated);
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

  // Profile Avatar IPC Handlers (Local File Picker & Storage)
  
  // Save Base64 Avatar directly from Renderer file picker
  ipcMain.handle('avatar:save-base64', async (_, { base64Data }) => {
    try {
      if (!base64Data) return { success: false, error: 'Empty data' };
      const configDir = path.join(app.getPath('userData'));
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      const targetFile = path.join(configDir, 'avatar.png');
      
      const raw = base64Data.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(targetFile, Buffer.from(raw, 'base64'));

      const settings = getSettings();
      settings.avatar_url = base64Data;
      saveSettings(settings);

      return { success: true, avatar_url: base64Data };
    } catch (err) {
      console.error('[Avatar Base64 Save Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('avatar:pick-and-save', async () => {
    console.log('[Main IPC] avatar:pick-and-save invoked');
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(null, {
        title: 'Pilih Foto Profil (PNG, JPG, WEBP)',
        filters: [{ name: 'Gambar', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg'] }],
        properties: ['openFile']
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const sourcePath = filePaths[0];
      const ext = path.extname(sourcePath).toLowerCase();
      const configDir = path.join(app.getPath('userData'));
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const targetPath = path.join(configDir, `avatar${ext}`);
      fs.copyFileSync(sourcePath, targetPath);

      // Convert to base64 data URL so renderer can display without web security restriction
      const fileBuffer = fs.readFileSync(targetPath);
      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.svg') mimeType = 'image/svg+xml';

      const dataUrl = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      // Save to local database settings
      const settings = getSettings(db);
      settings.avatar_data_url = dataUrl;
      saveSettings(db, settings);

      return { success: true, avatar_url: dataUrl };
    } catch (err) {
      console.error('[Avatar Picker Error]', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('avatar:reset', async () => {
    try {
      const settings = getSettings(db);
      delete settings.avatar_data_url;
      saveSettings(db, settings);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('avatar:get', async () => {
    try {
      const settings = getSettings(db);
      return { avatar_url: settings.avatar_data_url || null };
    } catch (err) {
      return { avatar_url: null };
    }
  });

  // Local-First JSON Backup Handlers
  ipcMain.handle('backup:export', async () => {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const defaultFileName = `megabox-backup-${dateStr}.json`;
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow && !mainWindow.isDestroyed() ? mainWindow : null, {
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
      const { canceled, filePaths } = await dialog.showOpenDialog(null, {
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




  // ==========================================
  // Megawarden (Local-First Password Vault) IPC Handlers
  // ==========================================
  ipcMain.handle("megawarden:list", async () => {
    try {
      return { success: true, items: megawarden.list() };
    } catch (err) {
      return { success: false, error: err.message, items: [] };
    }
  });

  ipcMain.handle("megawarden:save", async (_, entry) => {
    try {
      const saved = megawarden.save(entry);
      return { success: true, item: saved };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("megawarden:delete", async (_, id) => {
    try {
      megawarden.delete(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("megawarden:find-for-url", async (_, { url }) => {
    try {
      const matches = megawarden.findForUrl(url);
      return { success: true, matches: matches || [] };
    } catch (err) {
      return { success: false, error: err.message, matches: [] };
    }
  });

  ipcMain.handle("megawarden:generate-password", async (_, options) => {
    try {
      const password = megawarden.generatePassword(options);
      return { success: true, password };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  
  ipcMain.handle("megawarden:pick-and-import-csv", async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow && !mainWindow.isDestroyed() ? mainWindow : null, {
        title: "Pilih File Ekspor Google Password Manager (.csv)",
        filters: [{ name: "CSV Passwords", extensions: ["csv", "txt"] }],
        properties: ["openFile"]
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = filePaths[0];
      const raw = fs.readFileSync(filePath, "utf-8");
      return megawarden.importCsv(raw);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("megawarden:export-csv-to-file", async () => {
    try {
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow && !mainWindow.isDestroyed() ? mainWindow : null, {
        title: "Simpan Cadangan Sandi Megawarden (.csv)",
        defaultPath: "megawarden-passwords-" + new Date().toISOString().slice(0, 10) + ".csv",
        filters: [{ name: "CSV Passwords", extensions: ["csv"] }]
      });

      if (canceled || !filePath) {
        return { success: false, canceled: true };
      }

      const csv = megawarden.exportCsv();
      fs.writeFileSync(filePath, csv, "utf-8");
      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("megawarden:import-csv", async (_, { csvContent }) => {
    try {
      const result = megawarden.importCsv(csvContent);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("megawarden:export-csv", async () => {
    try {
      const csv = megawarden.exportCsv();
      return { success: true, csv };
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

  ipcMain.handle('system:open-external', async (_, { url }) => {
    try {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'Invalid URL protocol' };
    } catch (err) {
      console.error('[OpenExternal Error]', err);
      return { success: false, error: err.message };
    }
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
  initUpdater(mainWindow, db, { getSettings, saveSettings });
  createTray();

  app.on('activate', () => {
    if (mainWindow) mainWindow.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});
