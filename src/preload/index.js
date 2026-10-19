const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('megabox', {
  getApps: () => ipcRenderer.invoke('apps:get'),
  saveApp: (app) => ipcRenderer.invoke('apps:save', app),
  cacheFavicon: (appId, iconUrl) => ipcRenderer.invoke('apps:cache-favicon', { appId, iconUrl }),
  deleteApp: (id) => ipcRenderer.invoke('apps:delete', id),
  reorderApp: (id, dir) => ipcRenderer.invoke('apps:reorder', { id, dir }),
  setServiceProxy: (serviceId, proxyRules) => ipcRenderer.invoke('service:set-proxy', { serviceId, proxyRules }),
  openExternal: (url) => shell.openExternal(url),
  onAppsUpdated: (callback) => ipcRenderer.on('apps:updated', (_, apps) => callback(apps)),
  onReloadActive: (callback) => ipcRenderer.on('action:reload', () => callback()),
  onShortcutAction: (callback) => ipcRenderer.on('shortcut:action', (_, data) => callback(data)),
  
  // Extensions API
  getExtensionsCatalog: () => ipcRenderer.invoke('extensions:get-catalog'),
  toggleExtension: (appId, extensionId, enabled) => ipcRenderer.invoke('extensions:toggle', { appId, extensionId, enabled }),

  // Settings & System API
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  clearCache: () => ipcRenderer.invoke('system:clear-cache'),

  // Cloud Sync API
  getSyncStatus: () => ipcRenderer.invoke('sync:get-status'),
  loginSync: (email, password) => ipcRenderer.invoke('sync:login', { email, password }),
  registerSync: (email, password) => ipcRenderer.invoke('sync:register', { email, password }),
  logoutSync: () => ipcRenderer.invoke('sync:logout'),
  syncNow: () => ipcRenderer.invoke('sync:now'),
  focusWindow: () => ipcRenderer.invoke('window:focus'),
  onSyncStatusUpdated: (callback) => ipcRenderer.on('sync:status-updated', (_, status) => callback(status)),
  dispatchNotification: (title, body, icon) => ipcRenderer.invoke('notify:dispatch', { title, body, icon }),

});
