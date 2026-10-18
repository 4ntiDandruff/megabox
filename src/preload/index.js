const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('megabox', {
  getApps: () => ipcRenderer.invoke('apps:get'),
  saveApp: (app) => ipcRenderer.invoke('apps:save', app),
  deleteApp: (id) => ipcRenderer.invoke('apps:delete', id),
  onAppListUpdated: (callback) => ipcRenderer.on('apps:updated', (_, apps) => callback(apps)),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close')
});
