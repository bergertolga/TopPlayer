import { Env } from '../types';
import { validateUserId } from '../utils/validation';

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

async function getFavorStats(db: D1Database, userId: string) {
  let stats = await db
    .prepare('SELECT * FROM capital_favor_stats WHERE user_id = ?')
    .bind(userId)
    .first<{ favor_points: number; last_contribution: number }>();
  if (!stats) {
    await db
      .prepare('INSERT INTO capital_favor_stats (user_id, favor_points, last_contribution) VALUES (?, ?, ?)')
      .bind(userId, 0, 0)
      .run();
    stats = { favor_points: 0, last_contribution: 0 };
  }
  return stats;
}

async function ensurePremiumBalance(db: D1Database, userId: string) {
  const existing = await db
    .prepare('SELECT * FROM premium_balances WHERE user_id = ?')
    .bind(userId)
    .first<{ crowns: number }>();
  if (existing) return existing;
  await db.prepare('INSERT INTO premium_balances (user_id, crowns, last_stipend_claimed) VALUES (?, ?, ?)').bind(userId, 0, 0).run();
  return { crowns: 0 };
}

async function adjustCrowns(db: D1Database, userId: string, delta: number) {
  await ensurePremiumBalance(db, userId);
  await db.prepare('UPDATE premium_balances SET crowns = MAX(0, crowns + ?) WHERE user_id = ?').bind(delta, userId).run();
}

async function getResourceId(db: D1Database, code: string) {
  const row = await db.prepare('SELECT id FROM resources WHERE code = ?').bind(code).first<{ id: string }>();
  return row?.id || null;
}

async function adjustCityResource(db: D1Database, cityId: string, resourceCode: string, delta: number) {
  const resourceId = await getResourceId(db, resourceCode);
  if (!resourceId) {
    throw new Error(`Resource ${resourceCode} not found`);
  }
  const existing = await db
    .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
    .bind(cityId, resourceId)
    .first<{ amount: number }>();
  const next = Math.max(0, (existing?.amount || 0) + delta);
  await db
    .prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = excluded.amount`
    )
    .bind(cityId, resourceId, next)
    .run();
}

async function activateBoost(db: D1Database, userId: string, boost: { code: string; hours?: number; duration?: number }) {
  const durationMs = Math.floor((boost.hours ?? boost.duration ?? 0) * 60 * 60 * 1000);
  if (!durationMs) return;
  await db
    .prepare(
      'INSERT INTO boost_activations (id, user_id, boost_code, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(crypto.randomUUID(), userId, boost.code, JSON.stringify(boost), Date.now() + durationMs, Date.now())
    .run();
}

async function grantRewards(env: Env, userId: string, cityId: string, reward: any) {
  if (!reward) return;
  await getFavorStats(env.DB, userId);
  if (reward.coins) {
    await adjustCityResource(env.DB, cityId, 'COINS', reward.coins);
  }
  if (reward.crowns) {
    await adjustCrowns(env.DB, userId, reward.crowns);
  }
  if (reward.favor) {
    await env.DB
      .prepare('UPDATE capital_favor_stats SET favor_points = favor_points + ? WHERE user_id = ?')
      .bind(reward.favor, userId)
      .run();
  }
  if (reward.resources && typeof reward.resources === 'object') {
    for (const [code, amount] of Object.entries(reward.resources)) {
      if (amount) {
        await adjustCityResource(env.DB, cityId, code, amount as number);
      }
    }
  }
  if (reward.boost) {
    await activateBoost(env.DB, userId, reward.boost);
  }
  if (Array.isArray(reward.boosts)) {
    for (const boost of reward.boosts) {
      await activateBoost(env.DB, userId, boost);
    }
  }
}

export async function handleWorld(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return jsonResponse({ ok: true });
  }

  let userId: string;
  try {
    userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 400);
  }

  if (method === 'GET' && path === '/api/v1/world/capital') {
    const announcement = await env.DB
      .prepare('SELECT * FROM capital_announcements ORDER BY created_at DESC LIMIT 1')
      .first<{ title: string; body: string; created_at: number }>();
    const stats = await getFavorStats(env.DB, userId);
    const tierRows = await env.DB.prepare('SELECT * FROM capital_favor_tiers ORDER BY tier ASC').all();
    const allTiers = (tierRows?.results || []) as any[];
    const currentTier =
      (([...allTiers].reverse().find((tier: any) => stats.favor_points >= tier.points_required) as any) ||
        (allTiers[0] as any) ||
        null);
    const nextTier = (allTiers.find((tier: any) => tier.points_required > stats.favor_points) as any) || null;
    const storeOffers = await env.DB
      .prepare('SELECT * FROM capital_store_offers WHERE min_tier <= ? ORDER BY min_tier ASC')
      .bind((currentTier?.tier as number) ?? 0)
      .all();
    const requests = await env.DB
      .prepare(
        `SELECT * FROM capital_requests
         WHERE (expires_at IS NULL OR expires_at > ?) AND min_tier <= ?
         ORDER BY min_tier ASC`
      )
      .bind(Date.now(), (currentTier?.tier as number) ?? 0)
      .all();
    const currentPerks = currentTier ? JSON.parse((currentTier.perks_json as string) || '{}') : {};
    return jsonResponse({
      king: {
        name: 'King Aurelius',
        decree: announcement?.title || 'Hold fast, citizens!',
        message: announcement?.body || 'The capital thrives thanks to your contributions.',
        issuedAt: announcement?.created_at || Date.now(),
      },
      favor: {
        points: stats.favor_points,
        tier: currentTier
          ? { tier: currentTier.tier, name: currentTier.name, perks: currentPerks }
          : null,
        nextTier: nextTier
          ? {
              tier: nextTier.tier,
              name: nextTier.name,
              required: nextTier.points_required,
            }
          : null,
      },
      actions: [
        { code: 'donate_coins', costCoins: 500, reward: 5 },
        { code: 'donate_food', resource: 'FOOD', amount: 600, reward: 4 },
      ],
      store: (storeOffers?.results || []).map((offer: any) => ({
        code: offer.code,
        name: offer.name,
        description: offer.description,
        costFavor: offer.cost_favor,
        costCoins: offer.cost_coins,
        rewards: JSON.parse((offer.reward_json as string) || '{}'),
        minTier: offer.min_tier,
      })),
      requests: (requests?.results || []).map((req: any) => ({
        code: req.code,
        name: req.name,
        description: req.description,
        resource: req.resource_code,
        amount: req.amount_required,
        rewards: JSON.parse((req.reward_json as string) || '{}'),
        minTier: req.min_tier,
      })),
    });
  }

  if (method === 'POST' && path === '/api/v1/world/capital/contribute') {
    const body = (await request.json()) as { action: string };
    if (!body?.action) {
      return jsonResponse({ error: 'Action required' }, 400);
    }
    const city = await env.DB.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404);
    }

    let reward = 0;
    if (body.action === 'donate_coins') {
      const coinsRes = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind('COINS').first<{ id: string }>();
      if (!coinsRes) {
        return jsonResponse({ error: 'Coins resource missing' }, 500);
      }
      const coinsRow = await env.DB
        .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, coinsRes.id)
        .first<{ amount: number }>();
      if (!coinsRow || coinsRow.amount < 500) {
        return jsonResponse({ error: 'Need 500 coins to contribute' }, 400);
      }
      await env.DB
        .prepare('UPDATE city_resources SET amount = amount - 500 WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, coinsRes.id)
        .run();
      reward = 5;
    } else if (body.action === 'donate_food') {
      const resRow = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind('FOOD').first<{ id: string }>();
      if (!resRow) return jsonResponse({ error: 'Resource not found' }, 500);
      const stock = await env.DB
        .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, resRow.id)
        .first<{ amount: number }>();
      if (!stock || stock.amount < 600) {
        return jsonResponse({ error: 'Need 600 food to contribute' }, 400);
      }
      await env.DB
        .prepare('UPDATE city_resources SET amount = amount - 600 WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, resRow.id)
        .run();
      reward = 4;
    } else {
      return jsonResponse({ error: 'Unknown action' }, 400);
    }

    await env.DB
      .prepare('UPDATE capital_favor_stats SET favor_points = favor_points + ?, last_contribution = ? WHERE user_id = ?')
      .bind(reward, Date.now(), userId)
      .run();

    const stats = await getFavorStats(env.DB, userId);
    return jsonResponse({ success: true, favorPoints: stats.favor_points });
  }

  if (method === 'POST' && path === '/api/v1/world/capital/store/purchase') {
    const body = (await request.json()) as { offerCode: string };
    if (!body?.offerCode) {
      return jsonResponse({ error: 'offerCode required' }, 400);
    }
    const stats = await getFavorStats(env.DB, userId);
    const tierRows = await env.DB.prepare('SELECT * FROM capital_favor_tiers ORDER BY tier ASC').all();
    const tiers = (tierRows?.results || []) as any[];
    const storeTier =
      (([...tiers].reverse().find((tier: any) => stats.favor_points >= tier.points_required) as any) ||
        (tiers[0] as any) ||
        null);
    const offer = await env.DB
      .prepare('SELECT * FROM capital_store_offers WHERE code = ?')
      .bind(body.offerCode)
      .first<{ id: string; cost_favor: number; cost_coins: number; reward_json: string; min_tier: number }>();
    if (!offer) {
      return jsonResponse({ error: 'Offer not found' }, 404);
    }
    if (storeTier && storeTier.tier < offer.min_tier) {
      return jsonResponse({ error: 'Tier too low for this offer' }, 403);
    }
    const storePerks = storeTier ? JSON.parse((storeTier.perks_json as string) || '{}') : {};
    const discount = storePerks.storeDiscount || 0;
    const favorCost = Math.max(0, Math.ceil(offer.cost_favor * (1 - discount)));
    if (stats.favor_points < favorCost) {
      return jsonResponse({ error: 'Insufficient favor' }, 400);
    }
    const city = await env.DB.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404);
    }
    if (offer.cost_coins > 0) {
      const coinsRow = await env.DB
        .prepare(
          `SELECT cr.amount FROM city_resources cr
           JOIN resources r ON cr.resource_id = r.id
           WHERE cr.city_id = ? AND r.code = 'COINS'`
        )
        .bind(city.id)
        .first<{ amount: number }>();
      if (!coinsRow || coinsRow.amount < offer.cost_coins) {
        return jsonResponse({ error: 'Not enough coins' }, 400);
      }
      await adjustCityResource(env.DB, city.id, 'COINS', -offer.cost_coins);
    }
    await env.DB
      .prepare('UPDATE capital_favor_stats SET favor_points = favor_points - ? WHERE user_id = ?')
      .bind(favorCost, userId)
      .run();
    await grantRewards(env, userId, city.id, JSON.parse((offer.reward_json as string) || '{}'));
    const updated = await getFavorStats(env.DB, userId);
    return jsonResponse({ success: true, favorPoints: updated.favor_points });
  }

  if (method === 'POST' && path === '/api/v1/world/capital/requests/fulfill') {
    const body = (await request.json()) as { requestCode: string };
    if (!body?.requestCode) {
      return jsonResponse({ error: 'requestCode required' }, 400);
    }
    const stats = await getFavorStats(env.DB, userId);
    const fulfillTierRows = await env.DB.prepare('SELECT * FROM capital_favor_tiers ORDER BY tier ASC').all();
    const fulfillTiers = (fulfillTierRows?.results || []) as any[];
    const fulfillTier =
      (([...fulfillTiers].reverse().find((tier: any) => stats.favor_points >= tier.points_required) as any) ||
        (fulfillTiers[0] as any) ||
        null);
    const req = await env.DB
      .prepare(
        `SELECT * FROM capital_requests
         WHERE code = ? AND (expires_at IS NULL OR expires_at > ?)`
      )
      .bind(body.requestCode, Date.now())
      .first<{ resource_code: string; amount_required: number; reward_json: string; min_tier: number }>();
    if (!req) {
      return jsonResponse({ error: 'Request not available' }, 404);
    }
    if (fulfillTier && fulfillTier.tier < req.min_tier) {
      return jsonResponse({ error: 'Tier too low for this request' }, 403);
    }
    const city = await env.DB.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404);
    }
    const resourceId = await getResourceId(env.DB, req.resource_code);
    if (!resourceId) {
      return jsonResponse({ error: 'Resource not found' }, 500);
    }
    const stock = await env.DB
      .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
      .bind(city.id, resourceId)
      .first<{ amount: number }>();
    if (!stock || stock.amount < req.amount_required) {
      return jsonResponse({ error: 'Insufficient resources' }, 400);
    }
    await env.DB
      .prepare('UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?')
      .bind(req.amount_required, city.id, resourceId)
      .run();
    await grantRewards(env, userId, city.id, JSON.parse((req.reward_json as string) || '{}'));
    const updated = await getFavorStats(env.DB, userId);
    return jsonResponse({ success: true, favorPoints: updated.favor_points });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

