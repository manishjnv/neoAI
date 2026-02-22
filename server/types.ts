// ═══════════════════════════════════════════════════
// neoAI — Server Type Definitions
// ═══════════════════════════════════════════════════

/** Cloudflare bindings available in the Worker environment */
export type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
  AI: Ai;
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  HF_API_KEY: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
  ENVIRONMENT: string;
  RATE_LIMIT_PER_HOUR: string;
  RATE_LIMIT_PER_DAY: string;
};

/** Custom variables set by middleware, accessible via c.get() */
export type Variables = {
  requestId: string;
  user: UserIdentity | null;
  startTime: number;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

/** Authenticated user identity from CF Access JWT */
export interface UserIdentity {
  id: string;
  email: string;
  name: string;
}

/** Chat request body */
export interface ChatRequest {
  message: string;
  model: string;
  sessionId?: string;
}

/** Session record from D1 */
export interface SessionRecord {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

/** Message record from D1 */
export interface MessageRecord {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model: string | null;
  tokens_used: number;
  created_at: string;
}

/** Structured API error response */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    errorId: string;
    requestId: string;
    timestamp: string;
    retryable: boolean;
    details?: unknown;
  };
}

/** PII scan result */
export interface PiiScanResult {
  hasPii: boolean;
  detections: PiiDetection[];
  sanitized: string;
}

export interface PiiDetection {
  type: string;
  value: string;
  masked: string;
  start: number;
  end: number;
}
