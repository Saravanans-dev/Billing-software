const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printInvoice: (data) => ipcRenderer.send('print-invoice', data),
  onPrint: (callback) => ipcRenderer.on('print-invoice', callback),
});
