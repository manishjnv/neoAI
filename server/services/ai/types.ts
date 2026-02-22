// ═══════════════════════════════════════════════════
// neoAI — AI Provider Type Definitions
// ═══════════════════════════════════════════════════

/** Information about an available AI model */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  contextWindow: number;
  isFree: boolean;
  maxOutputTokens?: number;
}

/** Parameters for a chat completion request */
export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream: boolean;
}

/** A single message in a chat conversation */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Result of a streaming chat completion */
export interface StreamingChatResult {
  stream: ReadableStream<Uint8Array>;
  model: string;
  provider: string;
}

/**
 * Interface for AI model providers.
 * Each provider implements this to offer a uniform API.
 */
export interface AIProvider {
  /** Unique provider identifier */
  readonly id: string;

  /** Human-readable provider name */
  readonly name: string;

  /** Check if the provider is configured and available */
  isAvailable(): boolean;

  /** List models offered by this provider */
  listModels(): ModelInfo[];

  /** Send a chat request and return a streaming response */
  chat(params: ChatParams): Promise<StreamingChatResult>;
}
