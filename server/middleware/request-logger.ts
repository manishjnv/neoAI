// ═══════════════════════════════════════════════════
// neoAI — Request Logger Middleware
// ═══════════════════════════════════════════════════
// Logs structured request/response data for debugging.
// Uses console.log (free via Cloudflare dashboard logs).

import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';
import { generateId } from '../lib/id';
import { createLogger } from '../lib/logger';

export const requestLoggerMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const requestId = generateId('req');
  const startTime = Date.now();

  c.set('requestId', requestId);
  c.set('startTime', startTime);

  const logger = createLogger({ requestId });

  // Log request
  logger.info('→ request', {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('user-agent')?.slice(0, 100),
    cfRay: c.req.header('cf-ray'),
    country: c.req.header('cf-ipcountry'),
  });

  await next();

  // Log response
  const duration = Date.now() - startTime;
  const status = c.res.status;

  const logFn = status >= 500 ? logger.error : status >= 400 ? logger.warn : logger.info;
  logFn('← response', {
    status,
    duration: `${duration}ms`,
    userId: c.get('user')?.id,
  });
});
