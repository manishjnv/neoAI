// ═══════════════════════════════════════════════════
// neoAI — Sessions Routes
// ═══════════════════════════════════════════════════

import { Hono } from 'hono';
import type { HonoEnv } from '../types';
import { DatabaseService } from '../services/database';
import { Errors } from '../lib/errors';

const sessions = new Hono<HonoEnv>();

/** GET /api/sessions — List user's chat sessions */
sessions.get('/', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();

  const db = new DatabaseService(c.env.DB);
  const list = await db.listSessions(user.id);

  return c.json({ sessions: list });
});

/** GET /api/sessions/:id — Get session with messages */
sessions.get('/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();

  const sessionId = c.req.param('id');
  const db = new DatabaseService(c.env.DB);

  const session = await db.getSession(sessionId, user.id);
  if (!session) throw Errors.notFound('Session');

  const messages = await db.getMessages(sessionId);

  return c.json({ session, messages });
});

/** POST /api/sessions — Create a new session */
sessions.post('/', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();

  const body = await c.req.json<{ model?: string; title?: string }>();
  const db = new DatabaseService(c.env.DB);

  const session = await db.createSession(
    user.id,
    body.model || 'gemini-2.5-flash',
    body.title || 'New Chat',
  );

  return c.json({ session }, 201);
});

/** DELETE /api/sessions/:id — Delete a session */
sessions.delete('/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();

  const sessionId = c.req.param('id');
  const db = new DatabaseService(c.env.DB);

  const deleted = await db.deleteSession(sessionId, user.id);
  if (!deleted) throw Errors.notFound('Session');

  return c.json({ deleted: true });
});

/** PATCH /api/sessions/:id — Update session title */
sessions.patch('/:id', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();

  const sessionId = c.req.param('id');
  const body = await c.req.json<{ title: string }>();

  if (!body.title || typeof body.title !== 'string') {
    throw Errors.badRequest('Title is required');
  }

  const db = new DatabaseService(c.env.DB);

  const session = await db.getSession(sessionId, user.id);
  if (!session) throw Errors.notFound('Session');

  await db.updateSessionTitle(sessionId, body.title);

  return c.json({ updated: true });
});

export { sessions };
