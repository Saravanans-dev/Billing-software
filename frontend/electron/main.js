const {
  app, BrowserWindow, ipcMain, Menu, screen, globalShortcut,
} = require('electron');
const path = require('path');

let mainWindow;
let barcodeBuffer = '';
let barcodeTimer = null;

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'POS Full Screen',
          accelerator: 'F11',
          click: () => toggleFullScreen(),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Student Xerox Billing',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Student Xerox Billing Software',
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`,
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function toggleFullScreen() {
  if (!mainWindow) return;
  mainWindow.setFullScreen(!mainWindow.isFullScreen());
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1280,
    minHeight: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    show: false,
    autoHideMenuBar: false,
  });

  const isDev = process.env.ELECTRON_DEV === 'true' || process.argv.includes('--dev');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', true);
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow.webContents.send('fullscreen-changed', false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown') {
      if (input.key === 'Enter' && barcodeBuffer.length > 3) {
        mainWindow.webContents.send('barcode-scanned', barcodeBuffer);
        barcodeBuffer = '';
        return;
      }
      if (input.key.length === 1 && !input.control && !input.meta && !input.alt) {
        barcodeBuffer += input.key;
        clearTimeout(barcodeTimer);
        barcodeTimer = setTimeout(() => { barcodeBuffer = ''; }, 80);
      }
    }
  });

  createMenu();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('print-invoice', (_event, data) => {
  if (!mainWindow) return;
  mainWindow.webContents.print(
    {
      silent: data.silent || false,
      printBackground: true,
      deviceName: data.printer || '',
    },
    (_success, _failureReason) => {
      _event.reply('print-result', { success: _success, error: _failureReason });
    }
  );
});

ipcMain.handle('get-app-info', () => ({
  version: app.getVersion(),
  name: app.getName(),
  platform: process.platform,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
}));

ipcMain.handle('toggle-fullscreen', () => {
  toggleFullScreen();
  return mainWindow ? mainWindow.isFullScreen() : false;
});
