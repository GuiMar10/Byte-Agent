import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  theme: 'dark',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  streaming: true,
  globalSystemPrompt: 'You are a helpful assistant.',
  shortcuts: {
    newChat: 'Ctrl+N',
    toggleSidebar: 'Ctrl+B',
    settings: 'Ctrl+,',
    search: 'Ctrl+K',
  },
  storagePath: '',
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState(null);
  const [activeModel, setActiveModel] = useState('');
  const [models, setModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load settings and providers on mount
  useEffect(() => {
    async function load() {
      try {
        const [savedSettings, savedProviders] = await Promise.all([
          window.electronAPI.getSettings(),
          window.electronAPI.getProviders(),
        ]);
        if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
        if (savedProviders) {
          setProviders(savedProviders);
          const enabled = savedProviders.find((p) => p.enabled);
          if (enabled) {
            setActiveProvider(enabled);
            setActiveModel(enabled.defaultModel || '');
          }
        }
      } catch { /* use defaults */ }
    }
    load();
  }, []);

  const updateSettings = useCallback(async (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    await window.electronAPI.saveSettings(newSettings);
  }, [settings]);

  const updateProviders = useCallback(async (newProviders) => {
    setProviders(newProviders);
    await window.electronAPI.saveProviders(newProviders);
  }, []);

  const selectProvider = useCallback((provider) => {
    setActiveProvider(provider);
    setActiveModel(provider.defaultModel || '');
    setModels(provider.models || []);
  }, []);

  const selectModel = useCallback((modelId) => {
    setActiveModel(modelId);
  }, []);

  const fetchModelsForProvider = useCallback(async (provider) => {
    setIsLoadingModels(true);
    try {
      const fetched = await window.electronAPI.fetchModels(provider);
      setModels(fetched || []);
      // Update provider's cached model list
      setProviders((prev) => {
        const updated = prev.map((p) =>
          p.id === provider.id ? { ...p, models: fetched || [] } : p
        );
        window.electronAPI.saveProviders(updated);
        return updated;
      });
      return fetched;
    } catch (err) {
      console.error('Failed to fetch models:', err);
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  const contextValue = useMemo(() => ({
    settings,
    providers,
    activeProvider,
    activeModel,
    models,
    isLoadingModels,
    settingsOpen,
    updateSettings,
    updateProviders,
    selectProvider,
    selectModel,
    fetchModelsForProvider,
    setSettingsOpen,
  }), [settings, providers, activeProvider, activeModel, models, isLoadingModels, settingsOpen, updateSettings, updateProviders, selectProvider, selectModel, fetchModelsForProvider]);

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
