const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('displays'),
  openTemple: (id, mode) => ipcRenderer.invoke('open-temple', id, mode),
  getVersion: () => ipcRenderer.invoke('version')
});
