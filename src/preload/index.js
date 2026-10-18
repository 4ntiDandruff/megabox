const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('megabox', {
  getApps: () => ipcRenderer.invoke('apps:get'),
  saveApp: (app) => ipcRenderer.invoke('apps:save', app),
  deleteApp: (id) => ipcRenderer.invoke('apps:delete', id),
  setServiceProxy: (serviceId, proxyRules) => ipcRenderer.invoke('service:set-proxy', { serviceId, proxyRules }),
  openExternal: (url) => shell.openExternal(url),
  onAppsUpdated: (callback) => ipcRenderer.on('apps:updated', (_, apps) => callback(apps)),
  onReloadActive: (callback) => ipcRenderer.on('action:reload', () => callback()),
  
  // Extensions API
  getExtensionsCatalog: () => ipcRenderer.invoke('extensions:get-catalog'),
  toggleExtension: (appId, extensionId, enabled) => ipcRenderer.invoke('extensions:toggle', { appId, extensionId, enabled }),

  // Cloud Sync API
  getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
  loginSync: (email, password) => ipcRenderer.invoke('sync:login', { email, password }),
  registerSync: (email, password) => ipcRenderer.invoke('sync:register', { email, password }),
  logoutSync: () => ipcRenderer.invoke('sync:logout'),
  manualPushSync: () => ipcRenderer.invoke('sync:manual-push'),
  manualPullSync: () => ipcRenderer.invoke('sync:manual-pull'),
  onSyncStatusUpdated: (callback) => ipcRenderer.on('sync:status-updated', (_, status) => callback(status)),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
});
