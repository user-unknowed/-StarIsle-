const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('starisle', {
  platform: process.platform,
  versions: process.versions,
});
