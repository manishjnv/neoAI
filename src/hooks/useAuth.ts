// ═══════════════════════════════════════════════════
// neoAI — useAuth Hook
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { api } from '../lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchUser = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { user } = await api.me();
      setState({ user, loading: false, error: null });
    } catch (err) {
      setState({
        user: null,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to authenticate',
      });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    refresh: fetchUser,
  };
}
