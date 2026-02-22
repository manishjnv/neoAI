// ═══════════════════════════════════════════════════
// neoAI — Custom Error Classes
// ═══════════════════════════════════════════════════

import { generateId } from './id';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly errorId: string;
  public readonly retryable: boolean;
  public readonly details?: unknown;

  constructor(params: {
    code: string;
    message: string;
    statusCode?: number;
    retryable?: boolean;
    details?: unknown;
    cause?: Error;
  }) {
    super(params.message, { cause: params.cause });
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.errorId = generateId('err');
    this.retryable = params.retryable ?? false;
    this.details = params.details;
    this.name = 'AppError';
  }
}

// ── Pre-built error factories ──

export const Errors = {
  unauthorized(message = 'Authentication required') {
    return new AppError({ code: 'UNAUTHORIZED', message, statusCode: 401 });
  },

  forbidden(message = 'Access denied') {
    return new AppError({ code: 'FORBIDDEN', message, statusCode: 403 });
  },

  notFound(resource = 'Resource') {
    return new AppError({
      code: 'NOT_FOUND',
      message: `${resource} not found`,
      statusCode: 404,
    });
  },

  badRequest(message: string, details?: unknown) {
    return new AppError({
      code: 'BAD_REQUEST',
      message,
      statusCode: 400,
      details,
    });
  },

  piiDetected(detections: Array<{ type: string; masked: string }>) {
    return new AppError({
      code: 'PII_DETECTED',
      message: 'Your message contains sensitive personal information that cannot be sent to AI models.',
      statusCode: 400,
      details: { detections: detections.map((d) => ({ type: d.type, hint: d.masked })) },
    });
  },

  rateLimited(retryAfterSeconds: number) {
    return new AppError({
      code: 'RATE_LIMITED',
      message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
      statusCode: 429,
      retryable: true,
      details: { retryAfter: retryAfterSeconds },
    });
  },

  providerError(provider: string, cause?: Error) {
    return new AppError({
      code: 'AI_PROVIDER_ERROR',
      message: `AI provider "${provider}" encountered an error. Please try a different model.`,
      statusCode: 502,
      retryable: true,
      cause,
    });
  },

  providerUnavailable(provider: string) {
    return new AppError({
      code: 'AI_PROVIDER_UNAVAILABLE',
      message: `AI provider "${provider}" is not configured or unavailable.`,
      statusCode: 503,
      retryable: true,
    });
  },

  internal(message = 'Internal server error', cause?: Error) {
    return new AppError({
      code: 'INTERNAL_ERROR',
      message,
      statusCode: 500,
      retryable: true,
      cause,
    });
  },
} as const;
