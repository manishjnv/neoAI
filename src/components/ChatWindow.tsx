// ═══════════════════════════════════════════════════
// neoAI — Chat Window Component
// ═══════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import type { Message, ModelInfo } from '../types';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';

interface Props {
  messages: Message[];
  models: ModelInfo[];
  selectedModel: string;
  isStreaming: boolean;
  error: string | null;
  errorRetryable: boolean;
  onSend: (message: string) => void;
  onStop: () => void;
  onSelectModel: (modelId: string) => void;
  onClearError: () => void;
  onNewChat: () => void;
}

export function ChatWindow({
  messages,
  models,
  selectedModel,
  isStreaming,
  error,
  errorRetryable,
  onSend,
  onStop,
  onSelectModel,
  onClearError,
  onNewChat,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>
        <ModelSelector
          models={models}
          selectedModel={selectedModel}
          onSelect={onSelectModel}
          disabled={isStreaming}
        />
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="max-w-3xl mx-auto mt-4">
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-300">{error}</p>
                <div className="flex gap-2 mt-2">
                  {errorRetryable && (
                    <button
                      onClick={onClearError}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Dismiss & retry
                    </button>
                  )}
                  <button
                    onClick={onClearError}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        disabled={!selectedModel || models.length === 0}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
      <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/25">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-100 mb-2">Welcome to neoAI</h2>
      <p className="text-gray-400 max-w-md text-sm leading-relaxed">
        Chat with the latest free AI models. Select a model above and start typing to begin a conversation.
      </p>
      <div className="flex flex-wrap gap-2 mt-6 justify-center">
        {['Explain quantum computing', 'Write a Python script', 'Help me debug my code', 'Summarize this article'].map((prompt) => (
          <button
            key={prompt}
            className="px-3 py-2 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
