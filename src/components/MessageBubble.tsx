// ═══════════════════════════════════════════════════
// neoAI — Message Bubble Component
// ═══════════════════════════════════════════════════

import type { Message } from '../types';

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar + Name */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isUser
                ? 'bg-brand-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isUser ? 'U' : 'A'}
          </div>
          <span className="text-xs text-gray-500">
            {isUser ? 'You' : 'neoAI'}
            {message.model && !isUser && (
              <span className="ml-1 text-gray-600">· {message.model.split('/').pop()}</span>
            )}
          </span>
        </div>

        {/* Message content */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-brand-600 text-white rounded-br-md'
              : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700/50'
          }`}
        >
          {message.content ? (
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words prose-invert">
              {message.content}
            </div>
          ) : isStreaming ? (
            <div className="flex items-center gap-1.5 py-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : null}
        </div>

        {/* Streaming indicator */}
        {isStreaming && message.content && (
          <div className="flex items-center gap-1 mt-1 ml-1">
            <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Generating...</span>
          </div>
        )}
      </div>
    </div>
  );
}
