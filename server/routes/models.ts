// ═══════════════════════════════════════════════════
// neoAI — Models Routes
// ═══════════════════════════════════════════════════

import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { AIRegistry } from '../services/ai/registry';

const models = new Hono<HonoEnv>();

/** GET /api/models — List all available AI models */
models.get('/', (c) => {
  const registry = new AIRegistry(c.env);
  const allModels = registry.listModels();

  return c.json({
    models: allModels,
    count: allModels.length,
    providers: [...new Set(allModels.map((m) => m.provider))],
  });
});

export { models };
