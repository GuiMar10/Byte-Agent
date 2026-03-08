const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Conversations
  getConversations: () => ipcRenderer.invoke('store:getConversations'),
  getConversation: (id) => ipcRenderer.invoke('store:getConversation', id),
  saveConversation: (conv) => ipcRenderer.invoke('store:saveConversation', conv),
  deleteConversation: (id) => ipcRenderer.invoke('store:deleteConversation', id),
  exportConversations: () => ipcRenderer.invoke('store:exportConversations'),
  importConversations: (data) => ipcRenderer.invoke('store:importConversations', data),

  // Settings
  getSettings: () => ipcRenderer.invoke('store:getSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('store:saveSettings', settings),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  // Providers
  getProviders: () => ipcRenderer.invoke('store:getProviders'),
  saveProviders: (providers) => ipcRenderer.invoke('store:saveProviders', providers),

  // API Keys
  saveApiKey: (providerId, key) => ipcRenderer.invoke('keys:save', { providerId, key }),
  loadApiKey: (providerId) => ipcRenderer.invoke('keys:load', providerId),

  // Models
  fetchModels: (provider) => ipcRenderer.invoke('api:fetchModels', { provider }),

  // Chat (streaming via events)
  sendChatMessage: (data) => ipcRenderer.send('api:chat', data),
  stopGeneration: (requestId) => ipcRenderer.send('api:stop', { requestId }),
  onChatChunk: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('api:chat:chunk', handler);
    return () => ipcRenderer.removeListener('api:chat:chunk', handler);
  },
  onChatDone: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('api:chat:done', handler);
    return () => ipcRenderer.removeListener('api:chat:done', handler);
  },
  onChatError: (callback) => {
    const handler = (_, data) => callback(data);
    ipcRenderer.on('api:chat:error', handler);
    return () => ipcRenderer.removeListener('api:chat:error', handler);
  },

  // Files
  readFileAsBase64: (filePath) => ipcRenderer.invoke('files:readAsBase64', filePath),
});
