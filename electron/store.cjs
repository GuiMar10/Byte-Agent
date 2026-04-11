async function createStore() {
  const { default: Store } = await import('electron-store');
  const store = new Store({
    name: 'byte-data',
    defaults: {
      conversations: {},
      settings: {
        theme: 'system',
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1.0,
        streaming: true,
        globalSystemPrompt: 'You are a helpful assistant.',
        shortcuts: {},
        storagePath: '',
      },
      providers: [
        {
          id: 'openrouter',
          name: 'OpenRouter',
          type: 'openrouter',
          baseUrl: 'https://openrouter.ai/api/v1',
          defaultModel: 'openai/gpt-4o',
          models: [],
          enabled: true,
        },
        {
          id: 'openai',
          name: 'OpenAI',
          type: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-4o',
          models: [],
          enabled: false,
        },
        {
          id: 'anthropic',
          name: 'Anthropic',
          type: 'anthropic',
          baseUrl: 'https://api.anthropic.com/v1',
          defaultModel: 'claude-sonnet-4-20250514',
          models: [],
          enabled: false,
        },
        {
          id: 'gemini',
          name: 'Google Gemini',
          type: 'gemini',
          baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          defaultModel: 'gemini-2.5-flash',
          models: [],
          enabled: false,
        },
        {
          id: 'ollama',
          name: 'Ollama (Local)',
          type: 'ollama',
          baseUrl: 'http://localhost:11434',
          defaultModel: '',
          models: [],
          enabled: false,
        },
      ],
      encryptedKeys: {},
    },
  });

  return {
    // Conversations
    getConversations() {
      const convs = store.get('conversations', {});
      return Object.values(convs).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    getConversation(id) {
      return store.get(`conversations.${id}`, null);
    },
    saveConversation(conv) {
      store.set(`conversations.${conv.id}`, conv);
      return conv;
    },
    deleteConversation(id) {
      store.delete(`conversations.${id}`);
    },
    deleteAllConversations() {
      store.set('conversations', {});
    },
    exportConversations() {
      return store.get('conversations', {});
    },
    importConversations(data) {
      const existing = store.get('conversations', {});
      store.set('conversations', { ...existing, ...data });
    },

    // Settings
    getSettings() {
      return store.get('settings');
    },
    saveSettings(settings) {
      store.set('settings', settings);
    },

    // Providers
    getProviders() {
      return store.get('providers');
    },
    saveProviders(providers) {
      store.set('providers', providers);
    },

    // Encrypted keys
    getEncryptedKey(providerId) {
      return store.get(`encryptedKeys.${providerId}`, null);
    },
    setEncryptedKey(providerId, encrypted) {
      store.set(`encryptedKeys.${providerId}`, encrypted);
    },
  };
}

module.exports = { createStore };
