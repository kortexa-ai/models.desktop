require('./rt/electron-rt');
import { contextBridge, ipcRenderer } from 'electron';
import type { ModelGroup } from './models';

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  scanModels: () => ipcRenderer.invoke('scan-models'),
  deleteModel: (group: ModelGroup) => ipcRenderer.invoke('delete-model', group),
});

console.log('User Preload!');
