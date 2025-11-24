import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';

const CROWNS_STIPEND_AMOUNT = 5;
const STIPEND_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface PremiumBalance {
  user_id: string;
  crowns: number;
  last_stipend_claimed: number;
}

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
      ...headers,
    },
  });
}

async function getOrCreateBalance(db: D1Database, userId: string): Promise<PremiumBalance> {
  const existing = await db.prepare('SELECT * FROM premium_balances WHERE user_id = ?').bind(userId).first<PremiumBalance>();
  if (existing) return existing;
  await db.prepare('INSERT INTO premium_balances (user_id, crowns, last_stipend_claimed) VALUES (?, ?, ?)').bind(userId, 0, 0).run();
  return { user_id: userId, crowns: 0, last_stipend_claimed: 0 };
}

async function adjustCrowns(db: D1Database, userId: string, delta: number): Promise<PremiumBalance> {
  const balance = await getOrCreateBalance(db, userId);
  const nextValue = Math.max(0, balance.crowns + delta);
  await db.prepare('UPDATE premium_balances SET crowns = ? WHERE user_id = ?').bind(nextValue, userId).run();
  return { ...balance, crowns: nextValue };
}

async function ensureCityId(db: D1Database, userId: string): Promise<string | null> {
  const city = await db.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
  return city?.id ?? null;
}

async function addCoins(db: D1Database, cityId: string, amount: number) {
  const coins = await db.prepare('SELECT id FROM resources WHERE code = ?').bind('COINS').first<{ id: string }>();
  if (!coins) return;
  const existing = await db
    .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
    .bind(cityId, coins.id)
    .first<{ amount: number }>();
  const next = Math.max(0, (existing?.amount || 0) + amount);
  await db
    .prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = excluded.amount`
    )
    .bind(cityId, coins.id, next)
    .run();
}

async function addResources(db: D1Database, cityId: string, resources: Record<string, number>) {
  for (const [code, amount] of Object.entries(resources)) {
    if (!amount || amount === 0) continue;
    const resource = await db.prepare('SELECT id FROM resources WHERE code = ?').bind(code).first<{ id: string }>();
    if (!resource) continue;
    const existing = await db
      .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
      .bind(cityId, resource.id)
      .first<{ amount: number }>();
    const next = Math.max(0, (existing?.amount || 0) + amount);
    await db
      .prepare(
        `INSERT INTO city_resources (city_id, resource_id, amount, protected)
         VALUES (?, ?, ?, 0)
         ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = excluded.amount`
      )
      .bind(cityId, resource.id, next)
      .run();
  }
}

async function activateBoost(db: D1Database, userId: string, boost: { code: string; hours?: number; duration?: number }) {
  const durationMs = Math.floor((boost.hours ?? boost.duration ?? 0) * 60 * 60 * 1000);
  if (!durationMs) return;
  const expiresAt = Date.now() + durationMs;
  await db
    .prepare(
      'INSERT INTO boost_activations (id, user_id, boost_code, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .bind(crypto.randomUUID(), userId, boost.code, JSON.stringify(boost), expiresAt, Date.now())
    .run();
}

async function applyBundleContents(env: Env, userId: string, contents: any) {
  const db = env.DB;
  const cityId = await ensureCityId(db, userId);
  if (typeof contents.crowns === 'number' && contents.crowns > 0) {
    await adjustCrowns(db, userId, contents.crowns);
  }
  if (cityId && typeof contents.coins === 'number' && contents.coins > 0) {
    await addCoins(db, cityId, contents.coins);
  }
  if (cityId && contents.resources && typeof contents.resources === 'object') {
    await addResources(db, cityId, contents.resources);
  }
  if (Array.isArray(contents.boosts)) {
    for (const boost of contents.boosts) {
      await activateBoost(db, userId, boost);
    }
  }
}

async function getActiveBoosts(db: D1Database, userId: string) {
  const now = Date.now();
  const rows = await db
    .prepare('SELECT * FROM boost_activations WHERE user_id = ? AND expires_at > ? ORDER BY expires_at ASC')
    .bind(userId, now)
    .all();
  return rows?.results || [];
}

export async function handleShop(request: Request, env: Env): Promise<Response> {
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

  if (method === 'GET' && path === '/api/v1/premium/balance') {
    const balance = await getOrCreateBalance(env.DB, userId);
    const boosts = await getActiveBoosts(env.DB, userId);
    return jsonResponse({ crowns: balance.crowns, lastStipendAt: balance.last_stipend_claimed, boosts });
  }

  if (method === 'POST' && path === '/api/v1/premium/stipend') {
    const balance = await getOrCreateBalance(env.DB, userId);
    const now = Date.now();
    if (balance.last_stipend_claimed && now - balance.last_stipend_claimed < STIPEND_INTERVAL_MS) {
      return jsonResponse({ error: 'Stipend already claimed. Come back later.' }, 400);
    }
    await env.DB
      .prepare('UPDATE premium_balances SET crowns = crowns + ?, last_stipend_claimed = ? WHERE user_id = ?')
      .bind(CROWNS_STIPEND_AMOUNT, now, userId)
      .run();
    const updated = await getOrCreateBalance(env.DB, userId);
    return jsonResponse({ crowns: updated.crowns, lastStipendAt: now });
  }

  if (method === 'GET' && path === '/api/v1/shop/bundles') {
    const bundles = await env.DB
      .prepare('SELECT id, code, name, description, price_crowns, contents_json FROM shop_bundles WHERE is_active = 1')
      .all();
    const formatted = (bundles?.results || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      price: row.price_crowns,
      contents: JSON.parse(row.contents_json || '{}'),
    }));
    return jsonResponse({ bundles: formatted });
  }

  if (method === 'POST' && path === '/api/v1/shop/purchase') {
    const body = (await request.json()) as { bundleCode: string };
    if (!body?.bundleCode) {
      return jsonResponse({ error: 'Missing bundleCode' }, 400);
    }
    const bundle = await env.DB
      .prepare('SELECT * FROM shop_bundles WHERE code = ? AND is_active = 1')
      .bind(body.bundleCode)
      .first<{ id: string; price_crowns: number; contents_json: string }>();
    if (!bundle) {
      return jsonResponse({ error: 'Bundle not found' }, 404);
    }
    const balance = await getOrCreateBalance(env.DB, userId);
    if (balance.crowns < bundle.price_crowns) {
      return jsonResponse({ error: 'Insufficient Crowns' }, 400);
    }
    await adjustCrowns(env.DB, userId, -bundle.price_crowns);
    const contents = JSON.parse(bundle.contents_json || '{}');
    await applyBundleContents(env, userId, contents);
    return jsonResponse({
      success: true,
      bundleId: bundle.id,
      remainingCrowns: (await getOrCreateBalance(env.DB, userId)).crowns,
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

