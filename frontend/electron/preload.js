const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printInvoice: (data) => ipcRenderer.send('print-invoice', data),
  onPrintResult: (callback) => {
    ipcRenderer.on('print-result', (_event, result) => callback(result));
  },
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  onBarcodeScanned: (callback) => {
    ipcRenderer.on('barcode-scanned', (_event, barcode) => callback(barcode));
  },
  onFullScreenChanged: (callback) => {
    ipcRenderer.on('fullscreen-changed', (_event, isFullScreen) => callback(isFullScreen));
  },
});
