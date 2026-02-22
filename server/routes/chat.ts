// ═══════════════════════════════════════════════════
// neoAI — Chat Routes
// ═══════════════════════════════════════════════════

import { Hono } from 'hono';
import type { HonoEnv, ChatRequest } from '../types';
import { AIRegistry } from '../services/ai/registry';
import { DatabaseService } from '../services/database';
import { Errors } from '../lib/errors';
import { createLogger } from '../lib/logger';
import { hashUserId, generateId } from '../lib/id';

const chat = new Hono<HonoEnv>();

chat.post('/', async (c) => {
  const user = c.get('user');
  if (!user) throw Errors.unauthorized();

  const body = await c.req.json<ChatRequest>();

  // Validate request
  if (!body.message || typeof body.message !== 'string') {
    throw Errors.badRequest('Message is required');
  }
  if (!body.model || typeof body.model !== 'string') {
    throw Errors.badRequest('Model selection is required');
  }
  if (body.message.length > 32000) {
    throw Errors.badRequest('Message too long (max 32,000 characters)');
  }

  const logger = createLogger({
    requestId: c.get('requestId'),
    userId: user.id,
  });

  const registry = new AIRegistry(c.env);
  const db = new DatabaseService(c.env.DB);

  // Get or create session
  let sessionId = body.sessionId;
  if (sessionId) {
    // Verify the session belongs to this user
    const session = await db.getSession(sessionId, user.id);
    if (!session) {
      throw Errors.notFound('Session');
    }
  } else {
    // Create a new session
    const session = await db.createSession(user.id, body.model);
    sessionId = session.id;

    // Auto-title from first message (non-blocking)
    const title = db.generateTitle(body.message);
    c.executionCtx.waitUntil(db.updateSessionTitle(sessionId, title));
  }

  // Save user message
  c.executionCtx.waitUntil(
    db.addMessage({
      sessionId,
      role: 'user',
      content: body.message,
    }),
  );

  // Get conversation history for context
  const history = await db.getMessages(sessionId, 50);

  // Build messages array for AI
  const messages = [
    {
      role: 'system' as const,
      content:
        'You are neoAI, a helpful, accurate, and concise AI assistant. Respond in markdown when appropriate. Be direct and helpful.',
    },
    ...history.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })),
    { role: 'user' as const, content: body.message },
  ];

  logger.info('Chat request', {
    model: body.model,
    sessionId,
    messageLength: body.message.length,
    historyLength: history.length,
  });

  // Get streaming response from AI
  const result = await registry.chat({
    model: body.model,
    messages,
    stream: true,
  });

  // Collect the full response for storage while streaming to client
  let fullResponse = '';
  const decoder = new TextDecoder();
  const dbSessionId = sessionId;
  const modelUsed = body.model;

  const [clientStream, storageStream] = result.stream.tee();

  // Store the complete response after streaming finishes (non-blocking)
  c.executionCtx.waitUntil(
    (async () => {
      const reader = storageStream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullResponse += decoder.decode(value, { stream: true });
        }
        if (fullResponse) {
          await db.addMessage({
            sessionId: dbSessionId,
            role: 'assistant',
            content: fullResponse,
            model: modelUsed,
          });
          await db.touchSession(dbSessionId);

          // Log usage (hashed user ID for privacy)
          const userHash = await hashUserId(user.id);
          await c.env.DB.prepare(
            'INSERT INTO usage_log (id, user_hash, model, tokens_out, created_at) VALUES (?, ?, ?, ?, datetime(\'now\'))'
          )
            .bind(generateId('use'), userHash, modelUsed, fullResponse.length)
            .run();
        }
      } catch (err) {
        logger.error('Failed to store response', {
          error: err instanceof Error ? err.message : 'Unknown',
        });
      }
    })(),
  );

  // Return streaming response
  return new Response(clientStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Session-Id': sessionId,
      'X-Request-Id': c.get('requestId') || '',
      'Transfer-Encoding': 'chunked',
    },
  });
});

export { chat };
