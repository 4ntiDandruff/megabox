const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const webviewPreloadUrl = pathToFileURL(path.join(__dirname, '../main/preload-webview.js')).href;

contextBridge.exposeInMainWorld('megabox', {
  webviewPreloadUrl: webviewPreloadUrl,
  getApps: () => ipcRenderer.invoke('apps:get'),
  saveApp: (app) => ipcRenderer.invoke('apps:save', app),
  cacheFavicon: (appId, iconUrl) => ipcRenderer.invoke('apps:cache-favicon', { appId, iconUrl }),
  deleteApp: (id) => ipcRenderer.invoke('apps:delete', id),
  reorderApp: (id, dir) => ipcRenderer.invoke('apps:reorder', { id, dir }),
  setServiceProxy: (serviceId, proxyRules) => ipcRenderer.invoke('service:set-proxy', { serviceId, proxyRules }),
  openExternal: (url) => ipcRenderer.invoke('system:open-external', { url }),
  onAppsUpdated: (callback) => ipcRenderer.on('apps:updated', (_, apps) => callback(apps)),
  onReloadActive: (callback) => ipcRenderer.on('action:reload', () => callback()),
  onShortcutAction: (callback) => ipcRenderer.on('shortcut:action', (_, data) => callback(data)),
  
  // Instant Selection Translation Relay (Zero-CSP Node.js Engine)
  performTranslation: (text) => ipcRenderer.invoke('translate:perform', { text }),

  // Megawarden Local Password Vault API
  vaultList: () => ipcRenderer.invoke('megawarden:list'),
  vaultSave: (entry) => ipcRenderer.invoke('megawarden:save', entry),
  vaultDelete: (id) => ipcRenderer.invoke('megawarden:delete', id),
  vaultFindForUrl: (url) => ipcRenderer.invoke('megawarden:find-for-url', { url }),
  vaultGeneratePassword: (options) => ipcRenderer.invoke('megawarden:generate-password', options),
  vaultPickAndImportCsv: () => ipcRenderer.invoke('megawarden:pick-and-import-csv'),
  vaultExportCsvToFile: () => ipcRenderer.invoke('megawarden:export-csv-to-file'),
  vaultImportCsv: (csvContent) => ipcRenderer.invoke('megawarden:import-csv', { csvContent }),
  vaultExportCsv: () => ipcRenderer.invoke('megawarden:export-csv'),
  onVaultSavePrompt: (callback) => ipcRenderer.on('megawarden:save-prompt-relay', (_, data) => callback(data)),


// Download Manager & Progress Tracking API
  getDownloadHistory: () => ipcRenderer.invoke("downloads:get-history"),
  clearDownloadHistory: () => ipcRenderer.invoke("downloads:clear-history"),
  openDownloadFile: (filePath) => ipcRenderer.invoke("downloads:open-file", { filePath }),
  showDownloadInFolder: (filePath) => ipcRenderer.invoke("downloads:show-in-folder", { filePath }),
  cancelDownload: (id) => ipcRenderer.invoke("downloads:cancel", { id }),
  onDownloadStarted: (callback) => ipcRenderer.on("download:started", (_, data) => callback(data)),
  onDownloadProgress: (callback) => ipcRenderer.on("download:progress", (_, data) => callback(data)),
  onDownloadCompleted: (callback) => ipcRenderer.on("download:completed", (_, data) => callback(data)),

    // Settings & System API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  clearCache: () => ipcRenderer.invoke('system:clear-cache'),

  // Local-First Backup API
  exportBackup: () => ipcRenderer.invoke('backup:export'),
  importBackup: () => ipcRenderer.invoke('backup:import'),

  // Profile Avatar API (Local-First)
  pickAndSaveAvatar: () => ipcRenderer.invoke('avatar:pick-and-save'),
  saveAvatarBase64: (base64Data) => ipcRenderer.invoke('avatar:save-base64', { base64Data }),
  resetAvatar: () => ipcRenderer.invoke('avatar:reset'),
  getAvatar: () => ipcRenderer.invoke('avatar:get'),

  // Clipboard & Toast Feedback API
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write-text', { text }),
  onShowToast: (callback) => ipcRenderer.on('toast:show', (_, data) => callback(data)),

  // System Window & Notification API
  focusWindow: () => ipcRenderer.invoke('window:focus'),
  dispatchNotification: (title, body, icon) => ipcRenderer.invoke('notify:dispatch', { title, body, icon }),

  // Update Notifier API
  checkUpdatesManual: () => ipcRenderer.invoke('update:check-manual'),
  dismissUpdate: (version) => ipcRenderer.invoke('update:dismiss', version),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_, data) => callback(data))
});
