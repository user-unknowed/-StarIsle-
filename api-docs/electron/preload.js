const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveToken: (token) => ipcRenderer.invoke('save-token', token),
  loadToken: () => ipcRenderer.invoke('load-token'),
  deleteToken: () => ipcRenderer.invoke('delete-token'),
  getApiConfig: () => ipcRenderer.invoke('get-api-config'),
  saveApiConfig: (config) => ipcRenderer.invoke('save-api-config', config),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  platform: process.platform,
  isElectron: true,
});
