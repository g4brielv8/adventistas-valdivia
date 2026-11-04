const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('displays'),
  openTemple: (id) => ipcRenderer.invoke('open-temple', id),
  getVersion: () => ipcRenderer.invoke('version')
});
