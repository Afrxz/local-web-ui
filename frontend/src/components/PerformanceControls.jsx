import React from 'react';

/**
 * Performance-aware controls: max tokens, context cap, low-VRAM mode, context usage preset.
 */
export default function PerformanceControls({ settings, onUpdate, provider, isOpen, onToggle }) {
  if (!isOpen) return null;

  const isLocal = provider === 'ollama';

  const handleChange = (key, value) => {
    onUpdate({ ...settings, [key]: value });
  };

  const applyContextPreset = (preset) => {
    switch (preset) {
      case 'conservative':
        handleChange('max_context', 2048);
        handleChange('max_response_tokens', 500);
        break;
      case 'balanced':
        handleChange('max_context', 4096);
        handleChange('max_response_tokens', 800);
        break;
      case 'maximum':
        handleChange('max_context', isLocal ? 8192 : 16384);
        handleChange('max_response_tokens', isLocal ? 1024 : 2048);
        break;
    }
  };

  return (
    <div className="border-b border-gray-700 bg-gray-800/50 px-4 py-3">
      <div className="max-w-3xl mx-auto space-y-3">
        <h3 className="text-sm font-medium text-gray-300">Performance Controls</h3>

        {/* Context usage presets */}
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500 w-24">Context Usage:</label>
          <div className="flex gap-2">
            {['conservative', 'balanced', 'maximum'].map((preset) => (
              <button
                key={preset}
                onClick={() => applyContextPreset(preset)}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors capitalize"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Max context length */}
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500 w-24">Context Limit:</label>
          <input
            type="range"
            min={1024}
            max={isLocal ? 8192 : 131072}
            step={1024}
            value={settings.max_context || 4096}
            onChange={(e) => handleChange('max_context', parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-16 text-right">
            {settings.max_context || 4096}
          </span>
        </div>

        {/* Max response tokens */}
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500 w-24">Max Response:</label>
          <input
            type="range"
            min={128}
            max={isLocal ? 2048 : 4096}
            step={128}
            value={settings.max_response_tokens || 800}
            onChange={(e) => handleChange('max_response_tokens', parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-16 text-right">
            {settings.max_response_tokens || 800}
          </span>
        </div>

        {/* Temperature */}
        <div className="flex gap-2 items-center">
          <label className="text-xs text-gray-500 w-24">Temperature:</label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={settings.temperature || 0.7}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-16 text-right">
            {(settings.temperature || 0.7).toFixed(1)}
          </span>
        </div>

        {/* Low-VRAM safe mode (only for local) */}
        {isLocal && (
          <div className="flex gap-2 items-center">
            <label className="text-xs text-gray-500 w-24">Low-VRAM Mode:</label>
            <button
              onClick={() => {
                const enabled = !settings.low_vram_mode;
                const updates = { low_vram_mode: enabled };
                if (enabled) {
                  updates.max_context = 2048;
                  updates.max_response_tokens = 500;
                }
                onUpdate({ ...settings, ...updates });
              }}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                settings.low_vram_mode
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              {settings.low_vram_mode ? 'On' : 'Off'}
            </button>
            {settings.low_vram_mode && (
              <span className="text-xs text-amber-400">Conservative limits active</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
