const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

// Helper to get or create a persistent UUID
function getPersistentUUID() {
  const userDataPath = app.getPath('userData');
  const idFilePath = path.join(userDataPath, '.machine-id');
  
  try {
    if (fs.existsSync(idFilePath)) {
      return fs.readFileSync(idFilePath, 'utf8');
    }
    const id = crypto.randomUUID();
    fs.writeFileSync(idFilePath, id);
    return id;
  } catch (err) {
    console.error('Error managing machine ID:', err);
    return 'unknown-uuid';
  }
}

function getMacAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (!iface.internal && iface.family === 'IPv4' && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        return iface.mac;
      }
    }
  }
  return '00:00:00:00:00:00';
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disable sandbox to allow full Node.js access in preload
    },
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../../dist/index.html');
    mainWindow.loadFile(indexPath);
  }
}

// Handle Machine ID & MAC Request
ipcMain.handle('get-machine-id', async () => {
  try {
    const id = getPersistentUUID();
    const mac = getMacAddress();
    return { uuid: id, mac: mac };
  } catch (error) {
    console.error('Error getting machine info:', error);
    return { uuid: 'unknown', mac: 'unknown' };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    windows[0].webContents.send('app-closing');
  }
});
