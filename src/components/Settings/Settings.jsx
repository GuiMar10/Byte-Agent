import { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import { useTheme } from '../../contexts/ThemeContext.jsx';
import { useConversations } from '../../contexts/ConversationContext.jsx';
import { v4 as uuidv4 } from 'uuid';
import './Settings.css';

const TABS = [
  { id: 'providers', label: 'Providers', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
  { id: 'general', label: 'General', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' },
  { id: 'appearance', label: 'Appearance', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z' },
  { id: 'system-prompt', label: 'System Prompt', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
  { id: 'data', label: 'Data & Privacy', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
];

export default function Settings({ onClose }) {
  const [activeTab, setActiveTab] = useState('providers');

  return (
    <div className="settings-overlay" onClick={onClose} role="dialog" aria-label="Settings">
      <div className="settings" onClick={(e) => e.stopPropagation()}>
        <div className="settings__header">
          <h2 className="settings__title">Settings</h2>
          <button className="settings__close" onClick={onClose} aria-label="Close settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings__body">
          <nav className="settings__nav" aria-label="Settings tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`settings__nav-item ${activeTab === tab.id ? 'settings__nav-item--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={tab.icon} />
                  {tab.id === 'general' && <circle cx="12" cy="12" r="3" />}
                  {tab.id === 'system-prompt' && <><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" /></>}
                </svg>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="settings__content">
            {activeTab === 'providers' && <ProvidersTab />}
            {activeTab === 'general' && <GeneralTab />}
            {activeTab === 'appearance' && <AppearanceTab />}
            {activeTab === 'system-prompt' && <SystemPromptTab />}
            {activeTab === 'data' && <DataTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProvidersTab() {
  const { providers, updateProviders } = useSettings();
  const [editingKey, setEditingKey] = useState({});
  const [keyValues, setKeyValues] = useState({});

  const toggleProvider = (id) => {
    updateProviders(providers.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  };

  const updateProviderField = (id, field, value) => {
    updateProviders(providers.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const saveApiKey = async (providerId) => {
    const key = keyValues[providerId];
    if (key) {
      await window.electronAPI.saveApiKey(providerId, key);
      setEditingKey({ ...editingKey, [providerId]: false });
      setKeyValues({ ...keyValues, [providerId]: '' });
    }
  };

  const addProvider = () => {
    const newProvider = {
      id: uuidv4(),
      name: 'New Provider',
      type: 'openai',
      baseUrl: '',
      defaultModel: '',
      models: [],
      enabled: false,
    };
    updateProviders([...providers, newProvider]);
  };

  const removeProvider = (id) => {
    updateProviders(providers.filter((p) => p.id !== id));
  };

  return (
    <div className="settings-tab">
      <div className="settings-tab__header">
        <h3>API Providers</h3>
        <button className="settings-btn settings-btn--primary" onClick={addProvider}>
          + Add Provider
        </button>
      </div>

      <div className="provider-list">
        {providers.map((provider) => (
          <div key={provider.id} className="provider-card">
            <div className="provider-card__header">
              <label className="provider-toggle">
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={() => toggleProvider(provider.id)}
                  aria-label={`Enable ${provider.name}`}
                />
                <span className="provider-toggle__slider" />
              </label>
              <input
                className="provider-card__name"
                value={provider.name}
                onChange={(e) => updateProviderField(provider.id, 'name', e.target.value)}
                aria-label="Provider name"
              />
              {!['openrouter', 'openai', 'anthropic', 'gemini', 'ollama'].includes(provider.id) && (
                <button
                  className="provider-card__remove"
                  onClick={() => removeProvider(provider.id)}
                  aria-label="Remove provider"
                >
                  ×
                </button>
              )}
            </div>

            <div className="provider-card__fields">
              <div className="settings-field">
                <label className="settings-field__label">Type</label>
                <select
                  className="settings-field__select"
                  value={provider.type}
                  onChange={(e) => updateProviderField(provider.id, 'type', e.target.value)}
                >
                  <option value="openrouter">OpenRouter</option>
                  <option value="openai">OpenAI Compatible</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-field__label">Base URL</label>
                <input
                  className="settings-field__input"
                  type="text"
                  value={provider.baseUrl}
                  onChange={(e) => updateProviderField(provider.id, 'baseUrl', e.target.value)}
                  placeholder="https://api.example.com/v1"
                />
              </div>

              <div className="settings-field">
                <label className="settings-field__label">Default Model</label>
                <input
                  className="settings-field__input"
                  type="text"
                  value={provider.defaultModel}
                  onChange={(e) => updateProviderField(provider.id, 'defaultModel', e.target.value)}
                  placeholder="model-name"
                />
              </div>

              {provider.type !== 'ollama' && (
                <div className="settings-field">
                  <label className="settings-field__label">API Key</label>
                  {editingKey[provider.id] ? (
                    <div className="settings-field__row">
                      <input
                        className="settings-field__input"
                        type="password"
                        value={keyValues[provider.id] || ''}
                        onChange={(e) => setKeyValues({ ...keyValues, [provider.id]: e.target.value })}
                        placeholder="sk-..."
                        autoFocus
                      />
                      <button className="settings-btn settings-btn--primary" onClick={() => saveApiKey(provider.id)}>
                        Save
                      </button>
                      <button className="settings-btn" onClick={() => setEditingKey({ ...editingKey, [provider.id]: false })}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="settings-btn"
                      onClick={() => setEditingKey({ ...editingKey, [provider.id]: true })}
                    >
                      Set API Key
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeneralTab() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="settings-tab">
      <h3>General Defaults</h3>

      <div className="settings-field">
        <label className="settings-field__label">
          Temperature
          <span className="settings-field__value">{settings.temperature}</span>
        </label>
        <input
          className="settings-field__range"
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.temperature}
          onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
        />
      </div>

      <div className="settings-field">
        <label className="settings-field__label">Max Tokens</label>
        <input
          className="settings-field__input"
          type="number"
          min="1"
          max="128000"
          value={settings.maxTokens}
          onChange={(e) => updateSettings({ maxTokens: parseInt(e.target.value) || 4096 })}
        />
      </div>

      <div className="settings-field">
        <label className="settings-field__label">
          Top-P
          <span className="settings-field__value">{settings.topP}</span>
        </label>
        <input
          className="settings-field__range"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={settings.topP}
          onChange={(e) => updateSettings({ topP: parseFloat(e.target.value) })}
        />
      </div>

      <div className="settings-field">
        <label className="provider-toggle">
          <input
            type="checkbox"
            checked={settings.streaming}
            onChange={(e) => updateSettings({ streaming: e.target.checked })}
          />
          <span className="provider-toggle__slider" />
          <span style={{ marginLeft: '8px' }}>Enable streaming</span>
        </label>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'system', label: 'System', icon: '💻' },
  ];

  return (
    <div className="settings-tab">
      <h3>Theme</h3>

      <div className="theme-selector">
        {themes.map((t) => (
          <button
            key={t.value}
            className={`theme-option ${theme === t.value ? 'theme-option--active' : ''}`}
            onClick={() => setTheme(t.value)}
            aria-label={`${t.label} theme`}
          >
            <span className="theme-option__icon">{t.icon}</span>
            <span className="theme-option__label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SystemPromptTab() {
  const { settings, updateSettings } = useSettings();

  return (
    <div className="settings-tab">
      <h3>Global System Prompt</h3>
      <p className="settings-tab__description">
        This prompt will be used as the default for new conversations unless overridden.
      </p>
      <textarea
        className="settings-textarea"
        value={settings.globalSystemPrompt}
        onChange={(e) => updateSettings({ globalSystemPrompt: e.target.value })}
        rows={8}
        placeholder="You are a helpful assistant."
        aria-label="Global system prompt"
      />
    </div>
  );
}

function DataTab() {
  const [importStatus, setImportStatus] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { conversations, selectConversation, clearConversations } = useConversations();

  const handleExport = async () => {
    try {
      const data = await window.electronAPI.exportConversations();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `byte-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await window.electronAPI.importConversations(data);
      setImportStatus('Conversations imported successfully!');
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err) {
      setImportStatus('Import failed: invalid JSON');
      setTimeout(() => setImportStatus(''), 3000);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await window.electronAPI.deleteAllConversations();
      clearConversations();
      setShowDeleteConfirm(false);
      setImportStatus('All conversations deleted successfully!');
      setTimeout(() => setImportStatus(''), 3000);
    } catch (err) {
      console.error('Delete all failed:', err);
      setImportStatus('Failed to delete conversations');
      setTimeout(() => setImportStatus(''), 3000);
    }
  };

  return (
    <div className="settings-tab">
      <h3>Data & Privacy</h3>
      <p className="settings-tab__description">
        All data is stored locally on your machine. API keys are encrypted using your system's secure storage.
      </p>

      <div className="data-actions">
        <button className="settings-btn settings-btn--primary" onClick={handleExport}>
          Export Conversations
        </button>
        <label className="settings-btn settings-btn--secondary">
          Import Conversations
          <input type="file" accept=".json" onChange={handleImport} hidden />
        </label>
      </div>

      <div className="data-actions" style={{ marginTop: '24px' }}>
        <button
          className="settings-btn settings-btn--secondary"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={conversations.length === 0}
        >
          Delete All Chats
        </button>
      </div>

      {importStatus && (
        <div className="settings-status" role="status">{importStatus}</div>
      )}

      {showDeleteConfirm && (
        <div className="settings-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="settings-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h4>Delete All Chats?</h4>
            <p>This action cannot be undone. All {conversations.length} conversation(s) will be permanently deleted.</p>
            <div className="settings-confirm-actions">
              <button className="settings-btn" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="settings-btn settings-btn--secondary" onClick={handleDeleteAll}>
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
