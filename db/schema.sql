-- ═══════════════════════════════════════════════════
-- neoAI — D1 Database Schema
-- Free tier: 5M reads/day, 100K writes/day, 5GB
-- ═══════════════════════════════════════════════════

-- Sessions table: stores chat sessions per user
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT NOT NULL DEFAULT 'New Chat',
  model      TEXT NOT NULL DEFAULT 'gemini-2.0-flash',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions(user_id, updated_at DESC);

-- Messages table: stores individual chat messages
CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content    TEXT NOT NULL,
  model      TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_session
  ON messages(session_id, created_at ASC);

-- Rate limits table: tracks per-user request counts
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id    TEXT NOT NULL,
  window     TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, window)
);

-- Usage tracking: lightweight analytics (no PII)
CREATE TABLE IF NOT EXISTS usage_log (
  id         TEXT PRIMARY KEY,
  user_hash  TEXT NOT NULL,
  model      TEXT NOT NULL,
  tokens_in  INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_date
  ON usage_log(created_at);
