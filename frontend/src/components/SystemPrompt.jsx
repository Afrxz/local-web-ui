import React, { useState } from 'react';

const PRESETS = {
  default: {
    label: 'Default',
    prompt:
      'You are a helpful, friendly AI assistant. Provide clear, accurate, and well-structured responses. Use markdown formatting when appropriate.',
  },
  concise: {
    label: 'Concise',
    prompt:
      'You are a concise AI assistant. Give short, direct answers. Avoid unnecessary elaboration. Use bullet points when listing things.',
  },
  technical: {
    label: 'Technical',
    prompt:
      'You are a technical AI assistant specialized in software development and engineering. Provide detailed technical responses with code examples when relevant. Use proper terminology and explain complex concepts clearly.',
  },
};

/**
 * System prompt editor with presets and reset.
 */
export default function SystemPrompt({ systemPrompt, onUpdate, isOpen, onToggle }) {
  const [draft, setDraft] = useState(systemPrompt || PRESETS.default.prompt);

  // Sync draft when system prompt changes externally (session switch)
  React.useEffect(() => {
    setDraft(systemPrompt || PRESETS.default.prompt);
  }, [systemPrompt]);

  const handleSave = () => {
    onUpdate(draft);
  };

  const applyPreset = (key) => {
    setDraft(PRESETS[key].prompt);
    onUpdate(PRESETS[key].prompt);
  };

  if (!isOpen) return null;

  return (
    <div className="border-b border-gray-700 bg-gray-800/50 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">System Prompt</h3>
          <div className="flex gap-2">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          rows={3}
          className="w-full bg-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}
