// ═══════════════════════════════════════════════════
// neoAI — API Client
// ═══════════════════════════════════════════════════

import type { ApiErrorResponse, ModelInfo, Session, Message, User } from '../types';

const BASE = '/api';

class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public retryable: boolean = false,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: ApiErrorResponse | null = null;
    try {
      errorData = await response.json();
    } catch {
      // Response is not JSON
    }

    if (errorData?.error) {
      throw new ApiClientError(
        errorData.error.message,
        errorData.error.code,
        response.status,
        errorData.error.retryable,
        errorData.error.details,
      );
    }

    throw new ApiClientError(
      `Request failed: ${response.statusText}`,
      'UNKNOWN_ERROR',
      response.status,
    );
  }

  return response.json();
}

export const api = {
  /** Get current user info */
  async me(): Promise<{ user: User }> {
    const res = await fetch(`${BASE}/me`);
    return handleResponse(res);
  },

  /** List available AI models */
  async models(): Promise<{ models: ModelInfo[]; count: number; providers: string[] }> {
    const res = await fetch(`${BASE}/models`);
    return handleResponse(res);
  },

  /** List user's sessions */
  async sessions(): Promise<{ sessions: Session[] }> {
    const res = await fetch(`${BASE}/sessions`);
    return handleResponse(res);
  },

  /** Get session with messages */
  async session(id: string): Promise<{ session: Session; messages: Message[] }> {
    const res = await fetch(`${BASE}/sessions/${id}`);
    return handleResponse(res);
  },

  /** Create a new session */
  async createSession(model: string): Promise<{ session: Session }> {
    const res = await fetch(`${BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model }),
    });
    return handleResponse(res);
  },

  /** Delete a session */
  async deleteSession(id: string): Promise<void> {
    const res = await fetch(`${BASE}/sessions/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      await handleResponse(res);
    }
  },

  /** Rename a session */
  async renameSession(id: string, title: string): Promise<void> {
    const res = await fetch(`${BASE}/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      await handleResponse(res);
    }
  },

  /** Send a chat message and get a streaming response */
  async chat(
    params: { message: string; model: string; sessionId?: string },
    onChunk: (text: string) => void,
    onDone: (sessionId: string) => void,
    onError: (error: ApiClientError) => void,
  ): Promise<void> {
    try {
      const res = await fetch(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        let errorData: ApiErrorResponse | null = null;
        try {
          errorData = await res.json();
        } catch {
          // Not JSON
        }

        if (errorData?.error) {
          onError(
            new ApiClientError(
              errorData.error.message,
              errorData.error.code,
              res.status,
              errorData.error.retryable,
              errorData.error.details,
            ),
          );
          return;
        }

        onError(
          new ApiClientError(`Request failed: ${res.statusText}`, 'UNKNOWN_ERROR', res.status),
        );
        return;
      }

      const sessionId = res.headers.get('X-Session-Id') || params.sessionId || '';

      if (!res.body) {
        onError(new ApiClientError('No response body', 'NO_BODY', 500));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        if (text) onChunk(text);
      }

      onDone(sessionId);
    } catch (err) {
      if (err instanceof ApiClientError) {
        onError(err);
      } else {
        onError(
          new ApiClientError(
            err instanceof Error ? err.message : 'Network error',
            'NETWORK_ERROR',
            0,
            true,
          ),
        );
      }
    }
  },

  /** Health check */
  async health(): Promise<{ status: string }> {
    const res = await fetch(`${BASE}/health`);
    return handleResponse(res);
  },
};

export { ApiClientError };
