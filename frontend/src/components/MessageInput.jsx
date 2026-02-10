import React, { useState, useRef, useEffect } from 'react';

/**
 * Message input box with send button and keyboard shortcut (Enter to send).
 */
export default function MessageInput({ onSend, isStreaming, onStop, disabled, webSearch, onToggleWebSearch }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!isStreaming) {
      textareaRef.current?.focus();
    }
  }, [isStreaming]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isStreaming || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-700 bg-gray-800/50 px-4 py-3">
      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Select a model to start chatting...' : 'Type a message... (Enter to send, Shift+Enter for new line)'}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-3 resize-none outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 disabled:opacity-50"
        />
        <button
          onClick={onToggleWebSearch}
          title={webSearch ? 'Web search enabled' : 'Web search disabled'}
          className={`px-3 py-3 rounded-lg font-medium transition-colors flex-shrink-0 flex items-center gap-1.5 text-sm ${
            webSearch
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-600'
          }`}
        >
          <span>&#127760;</span>
          <span>Web</span>
        </button>
        {isStreaming ? (
          <button
            onClick={onStop}
            className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex-shrink-0"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex-shrink-0"
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
