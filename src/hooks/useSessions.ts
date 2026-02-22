// ═══════════════════════════════════════════════════
// neoAI — useSessions Hook
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import type { Session } from '../types';
import { api } from '../lib/api';

interface SessionsState {
  sessions: Session[];
  loading: boolean;
  error: string | null;
}

export function useSessions() {
  const [state, setState] = useState<SessionsState>({
    sessions: [],
    loading: true,
    error: null,
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { sessions } = await api.sessions();
      setState({ sessions, loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load sessions',
      }));
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(
    async (model: string) => {
      const { session } = await api.createSession(model);
      setState((s) => ({
        ...s,
        sessions: [session, ...s.sessions],
      }));
      setActiveSessionId(session.id);
      return session;
    },
    [],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      await api.deleteSession(id);
      setState((s) => ({
        ...s,
        sessions: s.sessions.filter((ses) => ses.id !== id),
      }));
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    },
    [activeSessionId],
  );

  const renameSession = useCallback(async (id: string, title: string) => {
    await api.renameSession(id, title);
    setState((s) => ({
      ...s,
      sessions: s.sessions.map((ses) => (ses.id === id ? { ...ses, title } : ses)),
    }));
  }, []);

  const selectSession = useCallback((id: string | null) => {
    setActiveSessionId(id);
  }, []);

  return {
    sessions: state.sessions,
    activeSessionId,
    loading: state.loading,
    error: state.error,
    fetchSessions,
    createSession,
    deleteSession,
    renameSession,
    selectSession,
  };
}
