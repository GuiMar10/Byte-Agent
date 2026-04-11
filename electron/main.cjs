const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const path = require('path');
const { createStore } = require('./store.cjs');
const { createProviderManager } = require('./providers.cjs');
const { readFile } = require('fs/promises');
const { spawn } = require('child_process');

app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blacklist');

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
  ipcMain.handle('store:deleteAllConversations', () => store.deleteAllConversations());
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
  ipcMain.on('api:chat', async (event, { requestId, provider, model, messages, settings, enableTools }) => {
    const apiKey = await getDecryptedKey(provider.id);
    const controller = new AbortController();
    const signal = controller.signal;
    activeRequests.set(requestId, controller);

    let execTool = null;
    if (enableTools) {
      execTool = async (toolName, args) => {
        if (toolName === 'terminal') {
          return await ipcRenderer.invoke('terminal:execute', args);
        }
        throw new Error(`Unknown tool: ${toolName}`);
      };
    }

    try {
      await providerManager.chatStream(
        provider,
        apiKey,
        model,
        messages,
        settings,
        enableTools,
        signal,
        (chunk) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('api:chat:chunk', { requestId, chunk });
          }
        },
        (thinking) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('api:chat:thinking', { requestId, thinking });
          }
        },
        execTool
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
        let errorMessage = err.message;
        if (errorMessage.includes('signal is not defined')) {
          errorMessage = 'Failed to initialize request. Please try again.';
        }
        if (!event.sender.isDestroyed()) {
          event.sender.send('api:chat:error', { requestId, error: errorMessage });
        }
      }
    } finally {
      activeRequests.delete(requestId);
    }
  });

  ipcMain.handle('api:getToolDefinitions', () => {
    return providerManager.getToolDefinitions();
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

  // ─── Terminal Command Execution ───
  ipcMain.handle('terminal:execute', async (_, { command, cwd }) => {
    return new Promise((resolve) => {
      const isWindows = process.platform === 'win32';
      const shell = isWindows ? 'cmd.exe' : '/bin/sh';
      const shellArgs = isWindows ? ['/c', command] : ['-c', command];

      const child = spawn(shell, shellArgs, {
        cwd: cwd || process.cwd(),
        env: { ...process.env },
        windowsHide: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code });
      });

      child.on('error', (err) => {
        resolve({ stdout: '', stderr: err.message, exitCode: -1 });
      });
    });
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
