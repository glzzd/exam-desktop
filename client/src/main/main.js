const { app, BrowserWindow, ipcMain, Menu } = require('electron');
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

  // Create Application Menu
  const template = [
    {
      label: 'Tətbiq',
      submenu: [
        { role: 'quit', label: 'Çıxış' }
      ]
    },
    {
      label: 'Görünüş',
      submenu: [
        { role: 'reload', label: 'Yenilə' },
        { role: 'forceReload', label: 'Məcburi Yenilə' },
        { role: 'toggleDevTools', label: 'Developer Tools' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Tam Ekran' }
      ]
    },
    {
      label: 'Parametlər',
      submenu: [
        {
          label: 'Server Tənzimləmələri',
          click: () => {
            mainWindow.webContents.send('open-settings');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

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

// Handle Local Backup
ipcMain.handle('save-local-backup', async (event, data) => {
  try {
    const { student, backupData } = data;
    if (!student || !backupData) return { success: false, error: 'Missing data' };

    // Construct filename: FirstName_LastName_FatherName.json
    // Use student info if available, otherwise fallback
    const firstName = student.firstName || 'Unknown';
    const lastName = student.lastName || 'Student';
    const fatherName = student.fatherName || '';
    
    const safeName = `${firstName}_${lastName}_${fatherName}`
      .trim()
      .replace(/[^a-z0-9_\u00C0-\u017F]+/gi, '_') // Allow unicode letters
      .replace(/^_+|_+$/g, '');

    const fileName = `${safeName || 'exam_backup'}.json`;

    // Determine target directory
    // Try to find the directory where the app executable resides
    let targetDir;
    
    if (app.isPackaged) {
      if (process.platform === 'darwin') {
         // On macOS, app.getPath('exe') is inside Contents/MacOS
         // We want the folder containing the .app bundle usually, or userData
         // Go up 4 levels: .../App.app/Contents/MacOS/App -> .../
         targetDir = path.resolve(path.dirname(app.getPath('exe')), '../../../../lastResults');
      } else {
         // On Windows/Linux, app.getPath('exe') is in the app folder
         targetDir = path.join(path.dirname(app.getPath('exe')), 'lastResults');
      }
    } else {
       // Development
       targetDir = path.join(process.cwd(), 'lastResults');
    }

    // Ensure directory exists. If we can't write there, fallback to userData
    try {
       if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
       }
       // Test write access
       fs.accessSync(targetDir, fs.constants.W_OK);
    } catch (err) {
       console.warn('Cannot write to preferred path, falling back to userData:', err);
       targetDir = path.join(app.getPath('userData'), 'lastResults');
       if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
       }
    }

    const filePath = path.join(targetDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    
    return { success: true, path: filePath };
  } catch (err) {
    console.error('Backup error:', err);
    return { success: false, error: err.message };
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
