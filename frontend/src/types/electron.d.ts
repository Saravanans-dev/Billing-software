interface ElectronAPI {
  printInvoice: (data: { silent?: boolean; printer?: string }) => void;
  onPrintResult: (callback: (result: { success: boolean; error: string }) => void) => void;
  toggleFullScreen: () => Promise<boolean>;
  getAppInfo: () => Promise<{ version: string; name: string; platform: string; electron: string; chrome: string; node: string }>;
  onBarcodeScanned: (callback: (barcode: string) => void) => void;
  onFullScreenChanged: (callback: (isFullScreen: boolean) => void) => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
