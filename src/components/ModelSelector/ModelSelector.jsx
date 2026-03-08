import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import './ModelSelector.css';

export default function ModelSelector() {
  const {
    providers,
    activeProvider,
    activeModel,
    models,
    isLoadingModels,
    selectProvider,
    selectModel,
    fetchModelsForProvider,
  } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const enabledProviders = providers.filter((p) => p.enabled);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleProviderSelect = async (provider) => {
    selectProvider(provider);
    if (!provider.models || provider.models.length === 0) {
      await fetchModelsForProvider(provider);
    }
  };

  const handleRefetch = async () => {
    if (activeProvider) {
      await fetchModelsForProvider(activeProvider);
    }
  };

  const filteredModels = search
    ? models.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase())
      )
    : models;

  const activeModelInfo = models.find((m) => m.id === activeModel);

  return (
    <div className="model-selector" ref={dropdownRef}>
      <button
        className="model-selector__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select model"
      >
        <span className="model-selector__label">
          {activeModelInfo?.name || activeModel || 'Select a model'}
        </span>
        <svg
          className={`model-selector__chevron ${isOpen ? 'model-selector__chevron--open' : ''}`}
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="model-selector__dropdown" role="listbox">
          {/* Provider tabs */}
          {enabledProviders.length > 1 && (
            <div className="model-selector__providers" role="tablist" aria-label="Providers">
              {enabledProviders.map((p) => (
                <button
                  key={p.id}
                  className={`model-selector__provider-tab ${
                    activeProvider?.id === p.id ? 'model-selector__provider-tab--active' : ''
                  }`}
                  onClick={() => handleProviderSelect(p)}
                  role="tab"
                  aria-selected={activeProvider?.id === p.id}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Search & Refresh */}
          <div className="model-selector__search-row">
            <input
              className="model-selector__search"
              type="text"
              placeholder="Search models…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search models"
              autoFocus
            />
            <button
              className="model-selector__refresh"
              onClick={handleRefetch}
              disabled={isLoadingModels}
              title="Refresh model list"
              aria-label="Refresh models"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoadingModels ? 'spinning' : ''}>
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>

          {/* Model list */}
          <div className="model-selector__list">
            {isLoadingModels ? (
              <div className="model-selector__loading">Loading models…</div>
            ) : filteredModels.length === 0 ? (
              <div className="model-selector__empty">
                {search ? 'No matching models' : 'No models available. Try refreshing.'}
              </div>
            ) : (
              filteredModels.map((model) => (
                <button
                  key={model.id}
                  className={`model-selector__option ${
                    model.id === activeModel ? 'model-selector__option--active' : ''
                  }`}
                  onClick={() => {
                    selectModel(model.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  role="option"
                  aria-selected={model.id === activeModel}
                >
                  <div className="model-selector__option-main">
                    <span className="model-selector__option-name">{model.name}</span>
                    <span className="model-selector__option-id">{model.id}</span>
                  </div>
                  <div className="model-selector__option-meta">
                    {model.contextLength && (
                      <span className="model-selector__option-ctx" title="Context window">
                        {(model.contextLength / 1000).toFixed(0)}k ctx
                      </span>
                    )}
                    {model.pricing?.prompt && (
                      <span className="model-selector__option-price" title="Cost per 1M input tokens">
                        ${(parseFloat(model.pricing.prompt) * 1000000).toFixed(2)}/M
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
