import { useState, useEffect, useCallback } from 'react';
import {
  listSessions,
  createSession,
  getSession,
  updateSession as apiUpdateSession,
  deleteSession as apiDeleteSession,
  clearSessionMemory,
} from '../services/api';

/**
 * Hook for managing sessions: list, create, switch, update, delete, clear.
 */
export default function useSession() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
      // If no active session, select the first one
      if (list.length > 0 && !activeSessionId) {
        await switchSession(list[0].id);
      } else if (list.length === 0) {
        // Create a default session
        const newSession = await createSession('New Chat');
        setSessions([newSession]);
        await switchSession(newSession.id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  }, [activeSessionId]);

  const switchSession = useCallback(async (sessionId) => {
    try {
      const session = await getSession(sessionId);
      setActiveSessionId(sessionId);
      setActiveSession(session);
    } catch (err) {
      console.error('Failed to switch session:', err);
    }
  }, []);

  const newSession = useCallback(async () => {
    try {
      const session = await createSession('New Chat');
      setSessions((prev) => [session, ...prev]);
      await switchSession(session.id);
      return session;
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  }, [switchSession]);

  const updateSession = useCallback(async (sessionId, data) => {
    try {
      const updated = await apiUpdateSession(sessionId, data);
      setActiveSession(updated);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, title: updated.title } : s,
        ),
      );
      return updated;
    } catch (err) {
      console.error('Failed to update session:', err);
    }
  }, []);

  const removeSession = useCallback(async (sessionId) => {
    try {
      await apiDeleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          await switchSession(remaining[0].id);
        } else {
          await newSession();
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [activeSessionId, sessions, switchSession, newSession]);

  const clearMemory = useCallback(async (sessionId) => {
    try {
      await clearSessionMemory(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSession((prev) => (prev ? { ...prev, messages: [] } : prev));
      }
    } catch (err) {
      console.error('Failed to clear memory:', err);
    }
  }, [activeSessionId]);

  // Refresh active session data (e.g., after a message is sent)
  const refreshActiveSession = useCallback(async () => {
    if (activeSessionId) {
      const session = await getSession(activeSessionId);
      setActiveSession(session);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, title: session.title } : s,
        ),
      );
    }
  }, [activeSessionId]);

  return {
    sessions,
    activeSessionId,
    activeSession,
    loading,
    switchSession,
    newSession,
    updateSession,
    removeSession,
    clearMemory,
    refreshActiveSession,
  };
}
