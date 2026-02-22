// ═══════════════════════════════════════════════════
// neoAI — useModels Hook
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ModelInfo } from '../types';
import { api } from '../lib/api';

interface ModelsState {
  models: ModelInfo[];
  loading: boolean;
  error: string | null;
}

export function useModels() {
  const [state, setState] = useState<ModelsState>({
    models: [],
    loading: true,
    error: null,
  });

  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem('neoai:model') || '',
  );

  const fetchedRef = useRef(false);

  const fetchModels = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { models } = await api.models();
      setState({ models, loading: false, error: null });

      // Validate saved model still exists, otherwise pick first available
      setSelectedModel((prev) => {
        const isValid = prev && models.some((m) => m.id === prev);
        if (isValid) return prev;
        const defaultModel = models.length > 0 ? models[0].id : '';
        if (defaultModel) localStorage.setItem('neoai:model', defaultModel);
        return defaultModel;
      });
    } catch (err) {
      setState({
        models: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load models',
      });
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchModels();
    }
  }, [fetchModels]);

  const selectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('neoai:model', modelId);
  }, []);

  return {
    models: state.models,
    selectedModel,
    selectModel,
    loading: state.loading,
    error: state.error,
    refresh: fetchModels,
  };
}
