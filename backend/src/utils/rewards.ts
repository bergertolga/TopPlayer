
import { mutatePremiumWallet } from './premium';

export async function grantRewards(
  db: D1Database,
  userId: string,
  cityId: string | null,
  rewards: {
    coins?: number;
    crowns?: number;
    favor?: number;
    gems?: number;
    resources?: Record<string, number>;
    boost?: any;
    items?: Record<string, number>; // itemCode: quantity
  },
  source: string
) {
  // Premium Currencies
  const walletDelta: { crowns?: number; gems?: number; favor?: number } = {};
  if (rewards.crowns) walletDelta.crowns = rewards.crowns;
  if (rewards.gems) walletDelta.gems = rewards.gems;
  if (rewards.favor) walletDelta.favor = rewards.favor;

  if (Object.keys(walletDelta).length > 0) {
    await mutatePremiumWallet(db, userId, walletDelta, { reason: 'reward', metadata: { source } });
  }

  // City Resources
  if (cityId) {
    if (rewards.coins) {
      await adjustCityResource(db, cityId, 'COINS', rewards.coins);
    }
    if (rewards.resources) {
      for (const [code, amount] of Object.entries(rewards.resources)) {
        await adjustCityResource(db, cityId, code, amount);
      }
    }
  }

  // Items (Premium Items)
  if (rewards.items) {
    for (const [itemCode, qty] of Object.entries(rewards.items)) {
      const item = await db.prepare('SELECT id FROM premium_items WHERE code = ?').bind(itemCode).first<{id: string}>();
      if (item) {
        await db.prepare(
          `INSERT INTO user_premium_items (id, user_id, premium_item_id, quantity, acquired_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(user_id, premium_item_id) DO UPDATE SET quantity = quantity + ?`
        ).bind(crypto.randomUUID(), userId, item.id, qty, Date.now(), qty).run();
      }
    }
  }

  // Boosts
  if (rewards.boost) {
     await db.prepare(
      'INSERT INTO boost_activations (id, user_id, boost_code, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(
      crypto.randomUUID(),
      userId,
      rewards.boost.code,
      JSON.stringify(rewards.boost),
      Date.now() + Math.floor((rewards.boost.hours ?? rewards.boost.duration ?? 0) * 60 * 60 * 1000),
      Date.now()
    )
    .run();
  }
}

async function adjustCityResource(db: D1Database, cityId: string, resourceCode: string, delta: number) {
  const resource = await db.prepare('SELECT id FROM resources WHERE code = ?').bind(resourceCode).first<{ id: string }>();
  if (!resource) {
    console.warn(`Resource ${resourceCode} not found during reward grant`);
    return;
  }
  await db.prepare(
    `INSERT INTO city_resources (city_id, resource_id, amount, protected)
     VALUES (?, ?, MAX(0, ?), 0)
     ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = MAX(0, city_resources.amount + ?)`
  )
    .bind(cityId, resource.id, delta, delta)
    .run();
}

