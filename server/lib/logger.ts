// ═══════════════════════════════════════════════════
// neoAI — Structured Logger (Free-Tier Friendly)
// ═══════════════════════════════════════════════════
// Uses console.log with structured JSON for Cloudflare's
// built-in log viewer (free). No external log platforms.

import { maskPiiForLog } from './pii-patterns';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  msg: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel, minLevel: LogLevel = 'info'): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
}

/**
 * Creates a structured logger instance.
 * All string values are PII-masked before logging.
 */
export function createLogger(context?: { requestId?: string; userId?: string }) {
  const minLevel: LogLevel = 'info';

  function log(level: LogLevel, msg: string, extra?: Record<string, unknown>) {
    if (!shouldLog(level, minLevel)) return;

    const entry: LogEntry = {
      level,
      msg: maskPiiForLog(msg),
      ts: new Date().toISOString(),
      ...context,
    };

    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        entry[key] = typeof value === 'string' ? maskPiiForLog(value) : value;
      }
    }

    const output = JSON.stringify(entry);

    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  return {
    debug: (msg: string, extra?: Record<string, unknown>) => log('debug', msg, extra),
    info: (msg: string, extra?: Record<string, unknown>) => log('info', msg, extra),
    warn: (msg: string, extra?: Record<string, unknown>) => log('warn', msg, extra),
    error: (msg: string, extra?: Record<string, unknown>) => log('error', msg, extra),
  };
}
