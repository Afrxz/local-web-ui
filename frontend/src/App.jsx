import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import MessageInput from './components/MessageInput';
import SystemPrompt from './components/SystemPrompt';
import ModelSelector from './components/ModelSelector';
import ProviderSettings from './components/ProviderSettings';
import PerformanceControls from './components/PerformanceControls';
import useSession from './hooks/useSession';
import useChat from './hooks/useChat';
import useProvider from './hooks/useProvider';

export default function App() {
  const {
    sessions,
    activeSessionId,
    activeSession,
    loading: sessionsLoading,
    switchSession,
    newSession,
    updateSession,
    removeSession,
    clearMemory,
    refreshActiveSession,
  } = useSession();

  const {
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
    loading: modelsLoading,
  } = useProvider();

  const {
    messages,
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    syncMessages,
  } = useChat(activeSession, refreshActiveSession);

  // Panel toggles
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);

  // Web search toggle
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);

  // Sync chat messages when active session changes
  useEffect(() => {
    syncMessages(activeSession);
  }, [activeSession?.id]);

  // Sync selected model from session settings
  useEffect(() => {
    if (activeSession?.settings?.model) {
      setSelectedModel(activeSession.settings.model);
    }
  }, [activeSession?.id]);

  // Sync provider and credentials from session settings
  useEffect(() => {
    if (activeSession?.settings?.provider) {
      setProvider(activeSession.settings.provider);
    }
    if (activeSession?.settings?.base_url) {
      setBaseUrl(activeSession.settings.base_url);
    }
    if (activeSession?.settings?.api_key) {
      setApiKey(activeSession.settings.api_key);
    }
  }, [activeSession?.id]);

  // Auto-fetch models on provider/credentials change (debounced for remote providers)
  useEffect(() => {
    if (provider === 'ollama') {
      fetchModels();
      return;
    }
    const timer = setTimeout(() => {
      if (baseUrl || apiKey) {
        fetchModels();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [provider, baseUrl, apiKey]);

  // Save model selection to session
  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
    if (activeSessionId && modelId) {
      updateSession(activeSessionId, {
        settings: {
          ...activeSession?.settings,
          model: modelId,
          provider,
          base_url: baseUrl || null,
          api_key: apiKey || null,
        },
      });
    }
  };

  // Save system prompt to session
  const handleSystemPromptUpdate = (prompt) => {
    if (activeSessionId) {
      updateSession(activeSessionId, { system_prompt: prompt });
    }
  };

  // Save performance settings to session
  const handlePerformanceUpdate = (newSettings) => {
    if (activeSessionId) {
      updateSession(activeSessionId, {
        settings: {
          ...newSettings,
          model: selectedModel,
          provider,
          base_url: baseUrl || null,
          api_key: apiKey || null,
        },
      });
    }
  };

  // Determine active provider/model label for header
  const providerLabel = provider === 'ollama' ? 'Local' : 'Cloud';
  const modelLabel = selectedModel || 'No model';
  const isRemote = provider !== 'ollama';

  if (sessionsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={switchSession}
        onNewSession={() => newSession({
          provider,
          base_url: baseUrl || undefined,
          api_key: apiKey || undefined,
          model: selectedModel || undefined,
        })}
        onDeleteSession={removeSession}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div className="border-b border-gray-700 bg-gray-800 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Provider/model indicator */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRemote ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
              <span className="text-sm font-medium text-gray-300">
                {providerLabel} · {modelLabel}
              </span>
            </div>

            {isRemote && (
              <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
                Messages leave this machine
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onSelectModel={handleModelSelect}
              provider={provider}
              baseUrl={baseUrl}
              apiKey={apiKey}
              onRefresh={fetchModels}
              loading={modelsLoading}
            />

            {/* Toggle buttons */}
            <button
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                showSystemPrompt
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              Prompt
            </button>
            <button
              onClick={() => setShowProviderSettings(!showProviderSettings)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                showProviderSettings
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              Provider
            </button>
            <button
              onClick={() => setShowPerformance(!showPerformance)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                showPerformance
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              Perf
            </button>
            <button
              onClick={() => activeSessionId && clearMemory(activeSessionId)}
              className="px-2 py-1 text-xs bg-gray-700 text-gray-400 hover:text-red-400 rounded transition-colors"
              title="Clear session memory"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Collapsible panels */}
        <SystemPrompt
          systemPrompt={activeSession?.system_prompt}
          onUpdate={handleSystemPromptUpdate}
          isOpen={showSystemPrompt}
          onToggle={() => setShowSystemPrompt(!showSystemPrompt)}
        />
        <ProviderSettings
          provider={provider}
          setProvider={setProvider}
          presets={presets}
          baseUrl={baseUrl}
          setBaseUrl={setBaseUrl}
          apiKey={apiKey}
          setApiKey={setApiKey}
          onTestConnection={testConnection}
          connectionStatus={connectionStatus}
          applyPreset={applyPreset}
          isOpen={showProviderSettings}
          onToggle={() => setShowProviderSettings(!showProviderSettings)}
        />
        <PerformanceControls
          settings={activeSession?.settings || {}}
          onUpdate={handlePerformanceUpdate}
          provider={provider}
          isOpen={showPerformance}
          onToggle={() => setShowPerformance(!showPerformance)}
        />

        {/* Chat messages */}
        <ChatWindow
          messages={messages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          error={error}
        />

        {/* Input */}
        <MessageInput
          onSend={(content, files) => sendMessage(content, webSearchEnabled, files)}
          isStreaming={isStreaming}
          onStop={stopStreaming}
          disabled={!selectedModel}
          webSearch={webSearchEnabled}
          onToggleWebSearch={() => setWebSearchEnabled((prev) => !prev)}
        />
      </div>
    </div>
  );
}
