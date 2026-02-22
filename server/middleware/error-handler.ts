// ═══════════════════════════════════════════════════
// neoAI — Global Error Handler Middleware
// ═══════════════════════════════════════════════════
// Catches all errors and returns structured JSON responses.

import { createMiddleware } from 'hono/factory';
import type { HonoEnv, ApiErrorResponse } from '../types';
import { AppError } from '../lib/errors';
import { generateId } from '../lib/id';
import { createLogger } from '../lib/logger';

export const errorHandlerMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  try {
    await next();
  } catch (err) {
    const requestId = c.get('requestId') || generateId('req');
    const logger = createLogger({
      requestId,
      userId: c.get('user')?.id,
    });

    let statusCode = 500;
    let errorResponse: ApiErrorResponse;

    if (err instanceof AppError) {
      statusCode = err.statusCode;
      errorResponse = {
        error: {
          code: err.code,
          message: err.message,
          errorId: err.errorId,
          requestId,
          timestamp: new Date().toISOString(),
          retryable: err.retryable,
          details: err.details,
        },
      };

      // Log at appropriate level
      if (statusCode >= 500) {
        logger.error(`[${err.code}] ${err.message}`, {
          statusCode,
          errorId: err.errorId,
          stack: err.cause instanceof Error ? err.cause.stack : undefined,
        });
      } else {
        logger.warn(`[${err.code}] ${err.message}`, {
          statusCode,
          errorId: err.errorId,
        });
      }
    } else {
      // Unknown error
      const errorId = generateId('err');
      const message = err instanceof Error ? err.message : 'Unknown error';

      errorResponse = {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          errorId,
          requestId,
          timestamp: new Date().toISOString(),
          retryable: true,
        },
      };

      logger.error(`Unhandled error: ${message}`, {
        statusCode: 500,
        errorId,
        stack: err instanceof Error ? err.stack : undefined,
      });
    }

    return c.json(errorResponse, statusCode as any);
  }
});
