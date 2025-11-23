const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
)`;

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

export async function ensureRateLimitTable(db: D1Database): Promise<void> {
  await db.prepare(TABLE_SQL).run();
}

export async function enforceRateLimit(
  db: D1Database,
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  await ensureRateLimitTable(db);

  const existing = await db
    .prepare('SELECT window_start, count FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ window_start: number; count: number }>();

  if (!existing) {
    await db
      .prepare('INSERT INTO rate_limits (key, window_start, count) VALUES (?, ?, ?)')
      .bind(key, now, 1)
      .run();

    return {
      allowed: true,
      remaining: config.limit - 1,
      reset: now + windowMs,
    };
  }

  const windowStart = existing.window_start;
  const count = existing.count;

  if (now - windowStart >= windowMs) {
    await db
      .prepare('UPDATE rate_limits SET window_start = ?, count = ? WHERE key = ?')
      .bind(now, 1, key)
      .run();

    return {
      allowed: true,
      remaining: config.limit - 1,
      reset: now + windowMs,
    };
  }

  if (count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      reset: windowStart + windowMs,
    };
  }

  const updatedCount = count + 1;
  await db
    .prepare('UPDATE rate_limits SET count = ? WHERE key = ?')
    .bind(updatedCount, key)
    .run();

  return {
    allowed: true,
    remaining: config.limit - updatedCount,
    reset: windowStart + windowMs,
  };
}

