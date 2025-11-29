export interface PremiumWallet {
  user_id: string;
  crowns: number;
  gems: number;
  favor: number;
  last_stipend_claim: number | null;
  updated_at: number;
}

async function ensureWallet(db: D1Database, userId: string): Promise<PremiumWallet> {
  const existing = await db
    .prepare('SELECT * FROM premium_currencies WHERE user_id = ?')
    .bind(userId)
    .first<PremiumWallet>();
  if (existing) {
    return existing;
  }
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO premium_currencies (user_id, crowns, gems, favor, last_stipend_claim, updated_at)
       VALUES (?, 0, 0, 0, 0, ?)`
    )
    .bind(userId, now)
    .run();
  return {
    user_id: userId,
    crowns: 0,
    gems: 0,
    favor: 0,
    last_stipend_claim: 0,
    updated_at: now,
  };
}

export async function getPremiumWallet(db: D1Database, userId: string): Promise<PremiumWallet> {
  return ensureWallet(db, userId);
}

export async function recordPremiumLedger(
  db: D1Database,
  userId: string,
  delta: { crowns?: number; gems?: number; favor?: number },
  reason: string,
  metadata?: Record<string, any>
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO premium_ledger (id, user_id, delta_crowns, delta_gems, delta_favor, reason, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      userId,
      delta.crowns ?? 0,
      delta.gems ?? 0,
      delta.favor ?? 0,
      reason,
      metadata ? JSON.stringify(metadata) : null,
      Date.now()
    )
    .run();
}

export async function mutatePremiumWallet(
  db: D1Database,
  userId: string,
  delta: { crowns?: number; gems?: number; favor?: number },
  options: { reason: string; metadata?: Record<string, any>; updateStipendAt?: number | null } = { reason: 'unknown' }
): Promise<PremiumWallet> {
  const wallet = await ensureWallet(db, userId);
  const nextCrowns = Math.max(0, wallet.crowns + (delta.crowns ?? 0));
  const nextGems = Math.max(0, wallet.gems + (delta.gems ?? 0));
  const nextFavor = Math.max(0, wallet.favor + (delta.favor ?? 0));
  const stipendAt = options.updateStipendAt ?? wallet.last_stipend_claim;
  const now = Date.now();

  await db
    .prepare(
      `UPDATE premium_currencies
       SET crowns = ?, gems = ?, favor = ?, last_stipend_claim = COALESCE(?, last_stipend_claim), updated_at = ?
       WHERE user_id = ?`
    )
    .bind(nextCrowns, nextGems, nextFavor, stipendAt, now, userId)
    .run();

  await recordPremiumLedger(db, userId, delta, options.reason, options.metadata);

  return {
    user_id: userId,
    crowns: nextCrowns,
    gems: nextGems,
    favor: nextFavor,
    last_stipend_claim: stipendAt ?? wallet.last_stipend_claim,
    updated_at: now,
  };
}


