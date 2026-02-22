// ═══════════════════════════════════════════════════
// neoAI — Model Selector
// ═══════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import type { ModelInfo } from '../types';

interface Props {
  models: ModelInfo[];
  selectedModel: string;
  onSelect: (modelId: string) => void;
  disabled?: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  gemini: 'bg-blue-500/20 text-blue-400',
  groq: 'bg-orange-500/20 text-orange-400',
  'workers-ai': 'bg-amber-500/20 text-amber-400',
  huggingface: 'bg-yellow-500/20 text-yellow-400',
};

export function ModelSelector({ models, selectedModel, onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = models.find((m) => m.id === selectedModel);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Group models by provider
  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selected ? (
          <>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${PROVIDER_COLORS[selected.provider] || 'bg-gray-700 text-gray-400'}`}>
              {selected.provider}
            </span>
            <span className="truncate max-w-[160px]">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-500">Select model...</span>
        )}
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-80 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 animate-fade-in">
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <div key={provider}>
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/80 sticky top-0">
                {provider}
              </div>
              {providerModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-gray-800 transition-colors border-b border-gray-800/50 last:border-0 ${
                    model.id === selectedModel ? 'bg-brand-500/10 border-l-2 border-l-brand-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-200 font-medium">{model.name}</span>
                    {model.isFree && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                        Free
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{model.description}</p>
                </button>
              ))}
            </div>
          ))}
          {models.length === 0 && (
            <div className="px-3 py-6 text-center text-gray-500 text-sm">
              No models available. Check API key configuration.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
