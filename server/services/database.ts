// ═══════════════════════════════════════════════════
// neoAI — Database Service (D1)
// ═══════════════════════════════════════════════════
// Wraps D1 operations for sessions and messages.
// Free tier: 5M reads/day, 100K writes/day, 5GB.

import type { SessionRecord, MessageRecord } from '../types';
import { generateId } from '../lib/id';

export class DatabaseService {
  constructor(private db: D1Database) {}

  // ── Sessions ──

  async listSessions(userId: string, limit = 50): Promise<SessionRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?')
      .bind(userId, limit)
      .all<SessionRecord>();
    return result.results;
  }

  async getSession(sessionId: string, userId: string): Promise<SessionRecord | null> {
    const result = await this.db
      .prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?')
      .bind(sessionId, userId)
      .first<SessionRecord>();
    return result;
  }

  async createSession(userId: string, model: string, title = 'New Chat'): Promise<SessionRecord> {
    const id = generateId('ses');
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO sessions (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .bind(id, userId, title, model, now, now)
      .run();

    return { id, user_id: userId, title, model, created_at: now, updated_at: now };
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await this.db
      .prepare('UPDATE sessions SET title = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .bind(title, sessionId)
      .run();
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.db
      .prepare('UPDATE sessions SET updated_at = datetime(\'now\') WHERE id = ?')
      .bind(sessionId)
      .run();
  }

  async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    // First delete messages (cascade might not work in D1)
    await this.db
      .prepare('DELETE FROM messages WHERE session_id = ?')
      .bind(sessionId)
      .run();

    const result = await this.db
      .prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?')
      .bind(sessionId, userId)
      .run();

    return result.meta.changes > 0;
  }

  // ── Messages ──

  async getMessages(sessionId: string, limit = 100): Promise<MessageRecord[]> {
    const result = await this.db
      .prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?')
      .bind(sessionId, limit)
      .all<MessageRecord>();
    return result.results;
  }

  async addMessage(params: {
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    model?: string;
    tokensUsed?: number;
  }): Promise<MessageRecord> {
    const id = generateId('msg');
    const now = new Date().toISOString();

    await this.db
      .prepare(
        'INSERT INTO messages (id, session_id, role, content, model, tokens_used, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        id,
        params.sessionId,
        params.role,
        params.content,
        params.model || null,
        params.tokensUsed || 0,
        now,
      )
      .run();

    return {
      id,
      session_id: params.sessionId,
      role: params.role,
      content: params.content,
      model: params.model || null,
      tokens_used: params.tokensUsed || 0,
      created_at: now,
    };
  }

  /**
   * Generate a title from the first user message.
   * Truncates to 60 chars.
   */
  generateTitle(message: string): string {
    const cleaned = message.replace(/\n/g, ' ').trim();
    if (cleaned.length <= 60) return cleaned;
    return cleaned.slice(0, 57) + '...';
  }
}
