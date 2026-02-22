// ═══════════════════════════════════════════════════
// neoAI — Cloudflare Pages Functions Bridge
// ═══════════════════════════════════════════════════
// Catch-all route that delegates to the Hono app.
// All /api/* requests are handled by the server.

import { handle } from 'hono/cloudflare-pages';
import { app } from '../../server/index';

export const onRequest = handle(app);
