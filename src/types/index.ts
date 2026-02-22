// ═══════════════════════════════════════════════════
// neoAI — Frontend Type Definitions
// ═══════════════════════════════════════════════════

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  createdAt: string;
  isStreaming?: boolean;
}

export interface Session {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  isFree: boolean;
  maxOutputTokens?: number;
}

export interface ChatRequest {
  message: string;
  model: string;
  sessionId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  errorId?: string;
  requestId?: string;
  timestamp?: string;
  retryable?: boolean;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiError;
}
