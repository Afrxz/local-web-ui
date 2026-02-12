import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { markdownComponents } from '../utils/markdown.jsx';

/**
 * Chat message display with markdown rendering and auto-scroll.
 */
export default function ChatWindow({ messages, streamingContent, isStreaming, error }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-xl mb-2">Start a conversation</p>
          <p className="text-sm">Select a model and type a message below</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg, i) => (
        <MessageBubble key={i} role={msg.role} content={msg.content} files={msg.files} />
      ))}

      {isStreaming && streamingContent && (
        <MessageBubble role="assistant" content={streamingContent} isStreaming />
      )}

      {isStreaming && !streamingContent && (
        <div className="flex gap-3 max-w-3xl mx-auto">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">
            AI
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <span className="animate-pulse">Thinking</span>
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ role, content, files, isStreaming }) {
  const isUser = role === 'user';

  return (
    <div className="flex gap-3 max-w-3xl mx-auto">
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          isUser ? 'bg-blue-600' : 'bg-emerald-600'
        }`}
      >
        {isUser ? 'You' : 'AI'}
      </div>
      <div className="flex-1 min-w-0">
        {/* Attached files */}
        {files && files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((file, i) =>
              file.type && file.type.startsWith('image/') ? (
                <a key={i} href={file.dataUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={file.dataUrl}
                    alt={file.name}
                    className="h-32 max-w-xs rounded-lg object-cover border border-gray-600 hover:border-blue-500 transition-colors cursor-pointer"
                  />
                </a>
              ) : (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-600"
                >
                  {file.name}
                </span>
              )
            )}
          </div>
        )}
        <div className="markdown-body text-gray-200 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-5 bg-gray-400 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  );
}
