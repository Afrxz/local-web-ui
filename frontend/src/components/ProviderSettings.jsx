import React from 'react';

/**
 * Provider settings panel: toggle provider, preset dropdown, base URL,
 * API key input, and test connection button.
 */
export default function ProviderSettings({
  provider,
  setProvider,
  presets,
  baseUrl,
  setBaseUrl,
  apiKey,
  setApiKey,
  onTestConnection,
  connectionStatus,
  applyPreset,
  isOpen,
  onToggle,
}) {
  if (!isOpen) return null;

  return (
    <div className="border-b border-gray-700 bg-gray-800/50 px-4 py-3">
      <div className="max-w-3xl mx-auto space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Provider Settings</h3>

        {/* Provider toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setProvider('ollama')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              provider === 'ollama'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            Ollama (Local)
          </button>
          <button
            onClick={() => setProvider('openai_compat')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              provider === 'openai_compat'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            OpenAI-Compatible (Remote)
          </button>
        </div>

        {/* OpenAI-compatible settings */}
        {provider === 'openai_compat' && (
          <div className="space-y-2">
            {/* Preset dropdown */}
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-16">Preset:</label>
              <select
                onChange={(e) => e.target.value && applyPreset(e.target.value)}
                defaultValue=""
                className="flex-1 bg-gray-700 text-gray-200 rounded px-2 py-1.5 text-sm outline-none"
              >
                <option value="">Custom / Manual</option>
                {Object.entries(presets).map(([key, preset]) => (
                  <option key={key} value={key}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Base URL */}
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-16">URL:</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="flex-1 bg-gray-700 text-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* API Key */}
            <div className="flex gap-2 items-center">
              <label className="text-xs text-gray-500 w-16">API Key:</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="flex-1 bg-gray-700 text-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Test connection */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTestConnection}
            disabled={connectionStatus === 'testing'}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
          {connectionStatus === 'connected' && (
            <span className="text-sm text-emerald-400">Connected</span>
          )}
          {connectionStatus === 'failed' && (
            <span className="text-sm text-red-400">Connection failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
