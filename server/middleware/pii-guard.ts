// ═══════════════════════════════════════════════════
// neoAI — PII Guard Middleware
// ═══════════════════════════════════════════════════
// Intercepts requests with message bodies and scans
// for PII before forwarding to AI providers.

import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';
import { scanForPii } from '../lib/pii-patterns';
import { Errors } from '../lib/errors';
import { createLogger } from '../lib/logger';

/**
 * PII Guard middleware for chat endpoints.
 * Scans the 'message' field in request bodies.
 * Behavior: BLOCK — rejects the request if PII is found.
 *
 * Future: support 'mask' mode (send sanitized text) and 'warn' mode (allow but warn).
 */
export const piiGuardMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  // Only scan POST/PUT requests with JSON bodies
  const method = c.req.method;
  if (method !== 'POST' && method !== 'PUT') {
    return next();
  }

  const contentType = c.req.header('content-type') || '';
  if (!contentType.includes('application/json')) {
    return next();
  }

  try {
    // Clone the request body so it can be read again by route handlers
    const body = await c.req.json();
    const message = body?.message;

    if (typeof message !== 'string' || message.length === 0) {
      return next();
    }

    const result = scanForPii(message);

    if (result.hasPii) {
      const logger = createLogger({
        requestId: c.get('requestId'),
        userId: c.get('user')?.id,
      });

      // Log detection types only (never raw PII values)
      logger.warn('PII detected in user message', {
        types: result.detections.map((d) => d.type),
        count: result.detections.length,
      });

      throw Errors.piiDetected(
        result.detections.map((d) => ({
          type: d.type,
          masked: d.masked,
        })),
      );
    }
  } catch (err) {
    // Re-throw AppErrors (including PII detection errors)
    if (err instanceof Error && err.name === 'AppError') {
      throw err;
    }
    // Body parsing errors are non-fatal for PII guard
    // Let the route handler deal with malformed bodies
  }

  return next();
});
