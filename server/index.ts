// ═══════════════════════════════════════════════════
// neoAI — Hono Application Entry Point
// ═══════════════════════════════════════════════════
// Assembles all middleware and routes into the Hono app.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { HonoEnv } from './types';

// Middleware
import { errorHandlerMiddleware } from './middleware/error-handler';
import { requestLoggerMiddleware } from './middleware/request-logger';
import { authMiddleware } from './middleware/auth';
import { rateLimiterMiddleware } from './middleware/rate-limiter';
import { piiGuardMiddleware } from './middleware/pii-guard';

// Routes
import { health } from './routes/health';
import { models } from './routes/models';
import { chat } from './routes/chat';
import { sessions } from './routes/sessions';

const app = new Hono<HonoEnv>();

// ── Hono-level error fallback ──
app.onError((err, c) => {
  console.error('[onError fallback]', err?.message ?? err);
  const status = (err as any)?.statusCode ?? 500;
  return c.json(
    {
      error: {
        code: status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR',
        message: err?.message ?? 'Unknown error',
      },
    },
    status as any,
  );
});

// ── Global middleware ──
app.use('*', cors({
  origin: '*', // CF Access handles origin enforcement
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'CF-Access-JWT-Assertion'],
  exposeHeaders: ['X-Request-Id', 'X-Session-Id'],
  maxAge: 86400,
}));

app.use('*', errorHandlerMiddleware);
app.use('*', requestLoggerMiddleware);

// ── Public routes (no auth required) ──
app.route('/api/health', health);
app.route('/api/models', models);

// ── Protected routes (auth required) ──
app.use('/api/*', authMiddleware);

// Rate limiting on mutation endpoints
app.use('/api/chat', rateLimiterMiddleware);

// PII guard on chat endpoints
app.use('/api/chat', piiGuardMiddleware);

// ── API routes ──
app.route('/api/chat', chat);
app.route('/api/sessions', sessions);

// ── User info endpoint ──
app.get('/api/me', (c) => {
  const user = c.get('user');
  if (!user) return c.json({ user: null }, 401);
  return c.json({ user });
});

// ── Catch-all for unknown API paths ──
app.all('/api/*', (c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
        timestamp: new Date().toISOString(),
      },
    },
    404,
  );
});

export { app };
