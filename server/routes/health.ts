// ═══════════════════════════════════════════════════
// neoAI — Health Check Route
// ═══════════════════════════════════════════════════

import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { validateEnv } from '../lib/env';
import { AIRegistry } from '../services/ai/registry';

const health = new Hono<HonoEnv>();

/** GET /api/health — System health check */
health.get('/', async (c) => {
  const envCheck = validateEnv(c.env);
  const registry = new AIRegistry(c.env);

  // Quick D1 check
  let dbOk = false;
  try {
    await c.env.DB.prepare('SELECT 1').first();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = envCheck.valid && dbOk ? 'healthy' : 'degraded';

  return c.json({
    status,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    checks: {
      database: dbOk ? 'ok' : 'error',
      providers: registry.listModels().length,
      env: envCheck.valid ? 'ok' : 'missing_required',
    },
    warnings: envCheck.warnings.length > 0 ? envCheck.warnings : undefined,
  });
});

export { health };
