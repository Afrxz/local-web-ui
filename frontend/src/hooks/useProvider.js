import { useState, useEffect, useCallback } from 'react';
import {
  getProviderPresets,
  getProviderConfig,
  testConnection as apiTestConnection,
  listModels,
} from '../services/api';

/**
 * Hook for managing provider state: active provider, presets, models,
 * base URL, API key, and connection testing.
 */
export default function useProvider() {
  const [provider, setProvider] = useState(() => localStorage.getItem('provider') || 'ollama');
  const [presets, setPresets] = useState({});
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem('providerBaseUrl') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('providerApiKey') || '');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('selectedModel') || null);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'testing' | 'connected' | 'failed'
  const [loading, setLoading] = useState(false);

  // Persist provider config to localStorage
  useEffect(() => { localStorage.setItem('provider', provider); }, [provider]);
  useEffect(() => { localStorage.setItem('providerBaseUrl', baseUrl); }, [baseUrl]);
  useEffect(() => { localStorage.setItem('providerApiKey', apiKey); }, [apiKey]);
  useEffect(() => { if (selectedModel) localStorage.setItem('selectedModel', selectedModel); }, [selectedModel]);

  // Load presets and default config on mount
  useEffect(() => {
    getProviderPresets()
      .then((data) => setPresets(data.presets || {}))
      .catch(() => {});
    getProviderConfig()
      .then((data) => {
        setProvider(data.default_provider || 'ollama');
      })
      .catch(() => {});
  }, []);

  // Load models when provider or connection details change
  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const url = provider === 'ollama' ? undefined : baseUrl || undefined;
      const key = provider === 'ollama' ? undefined : apiKey || undefined;
      const data = await listModels(provider, url, key);
      setModels(data.models || []);
    } catch {
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [provider, baseUrl, apiKey]);

  const testConnection = useCallback(async () => {
    setConnectionStatus('testing');
    try {
      const url = provider === 'ollama' ? undefined : baseUrl || undefined;
      const key = provider === 'ollama' ? undefined : apiKey || undefined;
      const result = await apiTestConnection(provider, url, key);
      setConnectionStatus(result.status);
      if (result.status === 'connected') {
        await fetchModels();
      }
    } catch {
      setConnectionStatus('failed');
    }
  }, [provider, baseUrl, apiKey, fetchModels]);

  const applyPreset = useCallback((presetKey) => {
    const preset = presets[presetKey];
    if (preset) {
      setBaseUrl(preset.base_url);
      setProvider('openai_compat');
      setConnectionStatus(null);
      setModels([]);
      setSelectedModel(null);
    }
  }, [presets]);

  return {
    provider,
    setProvider,
    presets,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    models,
    selectedModel,
    setSelectedModel,
    connectionStatus,
    testConnection,
    fetchModels,
    applyPreset,
    loading,
  };
}
