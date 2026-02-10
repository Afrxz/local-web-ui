import React, { useEffect, useState } from 'react';
import { getModelInfo } from '../services/api';

/**
 * Model picker with metadata display (name, params, quantization, context length).
 */
export default function ModelSelector({
  models,
  selectedModel,
  onSelectModel,
  provider,
  baseUrl,
  apiKey,
  onRefresh,
  loading,
}) {
  const [modelMeta, setModelMeta] = useState(null);

  // Fetch metadata when model is selected
  useEffect(() => {
    if (!selectedModel) {
      setModelMeta(null);
      return;
    }
    getModelInfo(selectedModel, provider, baseUrl, apiKey)
      .then(setModelMeta)
      .catch(() => setModelMeta(null));
  }, [selectedModel, provider, baseUrl, apiKey]);

  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedModel || ''}
        onChange={(e) => onSelectModel(e.target.value || null)}
        className="bg-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
      >
        <option value="">Select a model...</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-gray-400 hover:text-gray-200 text-sm transition-colors disabled:opacity-50"
        title="Refresh model list"
      >
        {loading ? '...' : '↻'}
      </button>

      {modelMeta && (
        <div className="flex gap-3 text-xs text-gray-500">
          {modelMeta.parameter_count && <span>{modelMeta.parameter_count}</span>}
          {modelMeta.quantization && <span>{modelMeta.quantization}</span>}
          {modelMeta.context_length && <span>ctx: {modelMeta.context_length}</span>}
        </div>
      )}
    </div>
  );
}
