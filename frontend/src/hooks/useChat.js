import { useState, useRef, useCallback } from 'react';
import { streamChat } from '../services/api';

/**
 * Hook for chat state and streaming logic.
 * Manages messages display, streaming state, and abort control.
 */
export default function useChat(activeSession, refreshActiveSession) {
  const [messages, setMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Sync messages when active session changes
  const syncMessages = useCallback((session) => {
    if (session) {
      setMessages(session.messages || []);
    } else {
      setMessages([]);
    }
    setStreamingContent('');
    setIsStreaming(false);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (content, webSearch = false, files = undefined) => {
    if (!activeSession || (!content.trim() && (!files || files.length === 0)) || isStreaming) return;

    setError(null);

    // Optimistically add user message to display
    const userMsg = { role: 'user', content, ...(files ? { files } : {}) };
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);
    setStreamingContent('');

    const controller = streamChat(
      activeSession.id,
      content,
      webSearch,
      files,
      // onToken
      (token) => {
        setStreamingContent((prev) => prev + token);
      },
      // onDone
      (fullContent) => {
        setStreamingContent('');
        setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
        setIsStreaming(false);
        refreshActiveSession();
      },
      // onError
      (errMsg) => {
        setError(errMsg);
        setIsStreaming(false);
        setStreamingContent('');
      },
    );

    abortRef.current = controller;
  }, [activeSession, isStreaming, refreshActiveSession]);

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsStreaming(false);
      // Keep whatever was streamed so far as the response
      if (streamingContent) {
        setMessages((prev) => [...prev, { role: 'assistant', content: streamingContent }]);
        setStreamingContent('');
      }
    }
  }, [streamingContent]);

  return {
    messages,
    streamingContent,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    syncMessages,
  };
}
