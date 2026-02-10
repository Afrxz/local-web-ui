import React from 'react';

/**
 * Sidebar with session list and new chat button.
 */
export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}) {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      <div className="p-3">
        <button
          onClick={onNewSession}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
        >
          + New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer mb-0.5 transition-colors ${
              session.id === activeSessionId
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
            onClick={() => onSelectSession(session.id)}
          >
            <span className="flex-1 truncate text-sm">{session.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSession(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity text-xs p-1"
              title="Delete session"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 text-center">
        Local AI WebUI
      </div>
    </div>
  );
}
