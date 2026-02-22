// ═══════════════════════════════════════════════════
// neoAI — useModels Hook
// ═══════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
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

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('neoai:model') || '';
  });

  const fetchModels = useCallback(async () => {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      const { models } = await api.models();
      setState({ models, loading: false, error: null });

      // Set default model if none selected
      if (!selectedModel && models.length > 0) {
        const defaultModel = models[0].id;
        setSelectedModel(defaultModel);
        localStorage.setItem('neoai:model', defaultModel);
      }
    } catch (err) {
      setState({
        models: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load models',
      });
    }
  }, [selectedModel]);

  useEffect(() => {
    fetchModels();
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
