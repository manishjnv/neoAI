// ═══════════════════════════════════════════════════
// neoAI — Rate Limiter Middleware (D1-backed)
// ═══════════════════════════════════════════════════
// Tracks per-user request counts using D1 (free tier:
// 100K writes/day). Uses hourly + daily windows.

import { createMiddleware } from 'hono/factory';
import type { HonoEnv } from '../types';
import { Errors } from '../lib/errors';
import { createLogger } from '../lib/logger';

/**
 * Returns the current hourly window key (e.g., "2024-12-01T10")
 */
function getHourlyWindow(): string {
  const now = new Date();
  return `${now.toISOString().slice(0, 13)}`;
}

/**
 * Returns the current daily window key (e.g., "2024-12-01")
 */
function getDailyWindow(): string {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

/**
 * Rate limiter middleware.
 * Enforces per-user hourly and daily limits using D1.
 */
export const rateLimiterMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    // If no user (shouldn't happen after auth), skip rate limiting
    return next();
  }

  const db = c.env.DB;
  const limitPerHour = parseInt(c.env.RATE_LIMIT_PER_HOUR || '50', 10);
  const limitPerDay = parseInt(c.env.RATE_LIMIT_PER_DAY || '500', 10);

  const userId = user.id;
  const hourlyWindow = `h:${getHourlyWindow()}`;
  const dailyWindow = `d:${getDailyWindow()}`;

  const logger = createLogger({
    requestId: c.get('requestId'),
    userId,
  });

  try {
    // Batch check: get current counts for both windows
    const results = await db.batch([
      db
        .prepare('SELECT count FROM rate_limits WHERE user_id = ? AND window = ?')
        .bind(userId, hourlyWindow),
      db
        .prepare('SELECT count FROM rate_limits WHERE user_id = ? AND window = ?')
        .bind(userId, dailyWindow),
    ]);

    const hourlyCount = (results[0].results[0] as any)?.count ?? 0;
    const dailyCount = (results[1].results[0] as any)?.count ?? 0;

    // Check hourly limit
    if (hourlyCount >= limitPerHour) {
      const minutesRemaining = 60 - new Date().getMinutes();
      logger.warn('Rate limit exceeded (hourly)', {
        count: hourlyCount,
        limit: limitPerHour,
      });
      throw Errors.rateLimited(minutesRemaining * 60);
    }

    // Check daily limit
    if (dailyCount >= limitPerDay) {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setUTCHours(23, 59, 59, 999);
      const secondsRemaining = Math.ceil((endOfDay.getTime() - now.getTime()) / 1000);
      logger.warn('Rate limit exceeded (daily)', {
        count: dailyCount,
        limit: limitPerDay,
      });
      throw Errors.rateLimited(secondsRemaining);
    }

    // Increment both counters (non-blocking, fire-and-forget)
    c.executionCtx.waitUntil(
      db.batch([
        db
          .prepare(
            `INSERT INTO rate_limits (user_id, window, count)
             VALUES (?, ?, 1)
             ON CONFLICT (user_id, window) DO UPDATE SET count = count + 1`,
          )
          .bind(userId, hourlyWindow),
        db
          .prepare(
            `INSERT INTO rate_limits (user_id, window, count)
             VALUES (?, ?, 1)
             ON CONFLICT (user_id, window) DO UPDATE SET count = count + 1`,
          )
          .bind(userId, dailyWindow),
      ]),
    );

    // Clean up old windows (once per day, non-blocking)
    const cleanupKey = `cleanup:${getDailyWindow()}`;
    c.executionCtx.waitUntil(
      (async () => {
        try {
          // Only clean up if we haven't today (use KV as a flag)
          const done = await c.env.KV.get(cleanupKey);
          if (!done) {
            await db
              .prepare("DELETE FROM rate_limits WHERE window < ? AND window NOT LIKE 'd:%'")
              .bind(`h:${new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 13)}`)
              .run();
            await db
              .prepare("DELETE FROM rate_limits WHERE window < ? AND window LIKE 'd:%'")
              .bind(`d:${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`)
              .run();
            await c.env.KV.put(cleanupKey, '1', { expirationTtl: 86400 });
          }
        } catch {
          // Cleanup failure is non-critical
        }
      })(),
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err;
    // If rate limiting itself fails, log and allow the request
    logger.error('Rate limiter error', {
      error: err instanceof Error ? err.message : 'Unknown',
    });
  }

  return next();
});
