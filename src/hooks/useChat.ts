// ═══════════════════════════════════════════════════
// neoAI — useChat Hook
// ═══════════════════════════════════════════════════

import { useState, useCallback, useRef } from 'react';
import type { Message } from '../types';
import { api, ApiClientError } from '../lib/api';

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  errorRetryable: boolean;
}

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isStreaming: false,
    error: null,
    errorRetryable: false,
  });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef(false);
  const messageCountRef = useRef(0);

  /** Load messages for an existing session */
  const loadSession = useCallback(async (id: string) => {
    try {
      const { messages } = await api.session(id);
      const mapped: Message[] = messages.map((m: any) => ({
        id: m.id,
        sessionId: m.session_id,
        role: m.role,
        content: m.content,
        model: m.model,
        createdAt: m.created_at,
      }));
      setState({ messages: mapped, isStreaming: false, error: null, errorRetryable: false });
      setSessionId(id);
    } catch (err) {
      setState((s) => ({
        ...s,
        error: err instanceof Error ? err.message : 'Failed to load session',
        errorRetryable: true,
      }));
    }
  }, []);

  /** Start a new chat (clear state) */
  const newChat = useCallback(() => {
    setState({ messages: [], isStreaming: false, error: null, errorRetryable: false });
    setSessionId(null);
    messageCountRef.current = 0;
  }, []);

  /** Send a message */
  const sendMessage = useCallback(
    async (content: string, model: string) => {
      abortRef.current = false;
      messageCountRef.current += 1;
      const userMsgId = `local_user_${messageCountRef.current}`;
      const assistantMsgId = `local_assistant_${messageCountRef.current}`;

      // Add user message to UI immediately
      const userMsg: Message = {
        id: userMsgId,
        sessionId: sessionId || '',
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };

      // Add placeholder for assistant response
      const assistantMsg: Message = {
        id: assistantMsgId,
        sessionId: sessionId || '',
        role: 'assistant',
        content: '',
        model,
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, userMsg, assistantMsg],
        isStreaming: true,
        error: null,
        errorRetryable: false,
      }));

      await api.chat(
        { message: content, model, sessionId: sessionId || undefined },
        // onChunk
        (text) => {
          if (abortRef.current) return;
          setState((s) => ({
            ...s,
            messages: s.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content + text } : m,
            ),
          }));
        },
        // onDone
        (newSessionId) => {
          if (!sessionId && newSessionId) {
            setSessionId(newSessionId);
          }
          setState((s) => ({
            ...s,
            isStreaming: false,
            messages: s.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, isStreaming: false, sessionId: newSessionId || m.sessionId } : m,
            ),
          }));
        },
        // onError
        (error) => {
          setState((s) => ({
            ...s,
            isStreaming: false,
            error: error.message,
            errorRetryable: error.retryable,
            // Remove the empty assistant message on error
            messages: s.messages.filter(
              (m) => !(m.id === assistantMsgId && m.content === ''),
            ),
          }));
        },
      );
    },
    [sessionId],
  );

  /** Stop streaming */
  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setState((s) => ({
      ...s,
      isStreaming: false,
      messages: s.messages.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)),
    }));
  }, []);

  /** Clear error */
  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null, errorRetryable: false }));
  }, []);

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    error: state.error,
    errorRetryable: state.errorRetryable,
    sessionId,
    sendMessage,
    loadSession,
    newChat,
    stopStreaming,
    clearError,
  };
}
