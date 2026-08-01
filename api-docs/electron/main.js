const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let mainWindow = null;
const userDataPath = app.getPath('userData');
const tokenStoragePath = path.join(userDataPath, 'tokens.enc');

function generateKey() {
  return crypto.createHash('sha256')
    .update(app.getName() + app.getPath('userData'))
    .digest();
}

function encrypt(data) {
  const key = generateKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    data: encrypted,
  };
}

function decrypt(encryptedData) {
  try {
    const key = generateKey();
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    return null;
  }
}

function saveTokens(tokens) {
  try {
    const encrypted = encrypt(tokens);
    fs.writeFileSync(tokenStoragePath, JSON.stringify(encrypted), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save tokens:', error);
    return false;
  }
}

function loadTokens() {
  try {
    if (!fs.existsSync(tokenStoragePath)) {
      return null;
    }
    const encryptedData = JSON.parse(fs.readFileSync(tokenStoragePath, 'utf8'));
    return decrypt(encryptedData);
  } catch (error) {
    console.error('Failed to load tokens:', error);
    return null;
  }
}

function deleteTokens() {
  try {
    if (fs.existsSync(tokenStoragePath)) {
      fs.unlinkSync(tokenStoragePath);
    }
    return true;
  } catch (error) {
    console.error('Failed to delete tokens:', error);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: '星屿API文档',
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-token', async (event, token) => {
  return saveTokens({ jwtToken: token, savedAt: new Date().toISOString() });
});

ipcMain.handle('load-token', async () => {
  const tokens = loadTokens();
  return tokens ? tokens.jwtToken : null;
});

ipcMain.handle('delete-token', async () => {
  return deleteTokens();
});

ipcMain.handle('get-api-config', async () => {
  const configPath = path.join(userDataPath, 'api-config.json');
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('Failed to load API config:', error);
  }
  return null;
});

ipcMain.handle('save-api-config', async (event, config) => {
  const configPath = path.join(userDataPath, 'api-config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save API config:', error);
    return false;
  }
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  if (!mainWindow) return null;
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  if (!mainWindow) return null;
  return dialog.showSaveDialog(mainWindow, options);
});
