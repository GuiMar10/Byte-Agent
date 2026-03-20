const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const path = require('path');
const { createStore } = require('./store.cjs');
const { createProviderManager } = require('./providers.cjs');
const { readFile } = require('fs/promises');

let mainWindow;
let store;
let providerManager;
const activeRequests = new Map();

function createWindow() {
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
  const iconPath = isDev
    ? path.join(__dirname, '../public/byte.png')
    : path.join(__dirname, '../dist/byte.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    title: 'Byte',
    backgroundColor: '#0a0a0f',
    icon: iconPath,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  store = await createStore();
  providerManager = createProviderManager();
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

function registerIpcHandlers() {
  // ─── Conversations ───
  ipcMain.handle('store:getConversations', () => store.getConversations());
  ipcMain.handle('store:getConversation', (_, id) => store.getConversation(id));
  ipcMain.handle('store:saveConversation', (_, conv) => store.saveConversation(conv));
  ipcMain.handle('store:deleteConversation', (_, id) => store.deleteConversation(id));
  ipcMain.handle('store:exportConversations', () => store.exportConversations());
  ipcMain.handle('store:importConversations', (_, data) => store.importConversations(data));

  // ─── Settings ───
  ipcMain.handle('store:getSettings', () => store.getSettings());
  ipcMain.handle('store:saveSettings', (_, settings) => store.saveSettings(settings));

  // ─── Window Controls ───
  ipcMain.on('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  // ─── Providers ───
  ipcMain.handle('store:getProviders', () => store.getProviders());
  ipcMain.handle('store:saveProviders', (_, providers) => store.saveProviders(providers));

  // ─── API Keys (encrypted) ───
  ipcMain.handle('keys:save', (_, { providerId, key }) => {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key).toString('base64');
      store.setEncryptedKey(providerId, encrypted);
      return true;
    }
    store.setEncryptedKey(providerId, key);
    return true;
  });

  ipcMain.handle('keys:load', (_, providerId) => {
    const encrypted = store.getEncryptedKey(providerId);
    if (!encrypted) return null;
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(encrypted, 'base64');
        return safeStorage.decryptString(buffer);
      } catch {
        return encrypted;
      }
    }
    return encrypted;
  });

  // ─── Model Fetching ───
  ipcMain.handle('api:fetchModels', async (_, { provider }) => {
    const apiKey = await getDecryptedKey(provider.id);
    return providerManager.fetchModels(provider, apiKey);
  });

  // ─── Chat Streaming ───
  ipcMain.on('api:chat', async (event, { requestId, provider, model, messages, settings }) => {
    const apiKey = await getDecryptedKey(provider.id);
    const controller = new AbortController();
    activeRequests.set(requestId, controller);

    try {
      await providerManager.chatStream(
        provider,
        apiKey,
        model,
        messages,
        settings,
        controller.signal,
        (chunk) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('api:chat:chunk', { requestId, chunk });
          }
        }
      );
      if (!event.sender.isDestroyed()) {
        event.sender.send('api:chat:done', { requestId });
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        if (!event.sender.isDestroyed()) {
          event.sender.send('api:chat:done', { requestId, aborted: true });
        }
      } else {
        if (!event.sender.isDestroyed()) {
          event.sender.send('api:chat:error', { requestId, error: err.message });
        }
      }
    } finally {
      activeRequests.delete(requestId);
    }
  });

  ipcMain.on('api:stop', (_, { requestId }) => {
    const controller = activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestId);
    }
  });

  // ─── File Reading ───
  ipcMain.handle('files:readAsBase64', async (_, filePath) => {
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    return { data: buffer.toString('base64'), mime, name: path.basename(filePath) };
  });
}

async function getDecryptedKey(providerId) {
  const encrypted = store.getEncryptedKey(providerId);
  if (!encrypted) return null;
  if (safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(encrypted, 'base64');
      return safeStorage.decryptString(buffer);
    } catch {
      return encrypted;
    }
  }
  return encrypted;
}
