import React, { useState, useRef, useEffect } from 'react';

/**
 * Message input box with send button, file attachments, and keyboard shortcut (Enter to send).
 */
export default function MessageInput({ onSend, isStreaming, onStop, disabled, webSearch, onToggleWebSearch }) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState([]); // [{name, type, dataUrl}]
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

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
    if ((!text.trim() && files.length === 0) || isStreaming || disabled) return;
    onSend(text.trim(), files.length > 0 ? files : undefined);
    setText('');
    setFiles([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length === 0) return;

    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => [
          ...prev,
          { name: file.name, type: file.type, dataUrl: reader.result },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isImage = (type) => type && type.startsWith('image/');

  return (
    <div className="border-t border-gray-700 bg-gray-800/50 px-4 py-3">
      <div className="max-w-3xl mx-auto">
        {/* File preview strip */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="relative group bg-gray-700 rounded-lg overflow-hidden flex items-center"
              >
                {isImage(file.type) ? (
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="h-16 w-16 object-cover rounded-lg"
                  />
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-300 max-w-[150px] truncate">
                    {file.name}
                  </div>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 items-end">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.csv,.json,.md"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            title="Attach files - works best with vision-capable models (e.g. GPT-4o, LLaVA, Gemini)"
            className="px-3 py-3 bg-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex-shrink-0 text-lg"
          >
            +
          </button>

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
              disabled={(!text.trim() && files.length === 0) || disabled}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex-shrink-0"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
