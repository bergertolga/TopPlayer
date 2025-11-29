import { Env } from '../../types';
import { validateUserId, validateTransactionId, validateAmount } from '../../utils/validation';
import { verifyAppleTransaction, verifyAppleReceipt } from '../../utils/apple-receipt';
import { getPremiumWallet, mutatePremiumWallet, PremiumWallet } from '../../utils/premium';

const CROWNS_STIPEND_AMOUNT = 5;
const STIPEND_INTERVAL_MS = 24 * 60 * 60 * 1000;

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

async function applyBundleContents(env: Env, userId: string, bundleCode: string | null, contents: any) {
  const db = env.DB;
  const cityId = await ensureCityId(db, userId);
  if (typeof contents.crowns === 'number' && contents.crowns > 0) {
    await mutatePremiumWallet(db, userId, { crowns: contents.crowns }, { reason: 'shop_bundle_contents', metadata: { bundle: bundleCode } });
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
    const balance = await getPremiumWallet(env.DB, userId);
    const boosts = await getActiveBoosts(env.DB, userId);
    return jsonResponse({ crowns: balance.crowns, lastStipendAt: balance.last_stipend_claim, boosts });
  }

  if (method === 'POST' && path === '/api/v1/premium/stipend') {
    const balance = await getPremiumWallet(env.DB, userId);
    const now = Date.now();
    if (balance.last_stipend_claim && now - balance.last_stipend_claim < STIPEND_INTERVAL_MS) {
      return jsonResponse({ error: 'Stipend already claimed. Come back later.' }, 400);
    }
    const updated = await mutatePremiumWallet(
      env.DB,
      userId,
      { crowns: CROWNS_STIPEND_AMOUNT },
      { reason: 'daily_stipend', metadata: { source: 'stipend' }, updateStipendAt: now }
    );
    return jsonResponse({ crowns: updated.crowns, lastStipendAt: updated.last_stipend_claim });
  }

  if (method === 'GET' && path === '/api/v1/shop/bundles') {
    const bundles = await env.DB
      .prepare('SELECT id, code, name, description, price_crowns, contents_json, iap_product_id FROM shop_bundles WHERE is_active = 1')
      .all();
    const formatted = (bundles?.results || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      price: row.price_crowns,
      contents: JSON.parse(row.contents_json || '{}'),
      iapProductId: row.iap_product_id || null,
    }));
    return jsonResponse({ bundles: formatted });
  }

  if (method === 'POST' && path === '/api/v1/shop/purchase') {
    const body = (await request.json()) as {
      bundleCode: string;
      paymentMethod?: 'crowns' | 'cash';
      transactionId?: string;
      receiptData?: string;
      amount?: number;
    };
    if (!body?.bundleCode) {
      return jsonResponse({ error: 'Missing bundleCode' }, 400);
    }
    const bundle = await env.DB
      .prepare('SELECT * FROM shop_bundles WHERE code = ? AND is_active = 1')
      .bind(body.bundleCode)
      .first<{ id: string; price_crowns: number; contents_json: string; iap_product_id?: string }>();
    if (!bundle) {
      return jsonResponse({ error: 'Bundle not found' }, 404);
    }
    const paymentMethod = body.paymentMethod === 'cash' ? 'cash' : 'crowns';
    const contents = JSON.parse(bundle.contents_json || '{}');

    if (paymentMethod === 'crowns') {
      const balance = await getPremiumWallet(env.DB, userId);
      if (balance.crowns < bundle.price_crowns) {
        return jsonResponse({ error: 'Insufficient Crowns' }, 400);
      }
      await mutatePremiumWallet(
        env.DB,
        userId,
        { crowns: -bundle.price_crowns },
        { reason: 'bundle_purchase', metadata: { bundleCode: bundle.code } }
      );
      await applyBundleContents(env, userId, bundle.code, contents);
      return jsonResponse({
        success: true,
        bundleId: bundle.id,
        remainingCrowns: (await getPremiumWallet(env.DB, userId)).crowns,
      });
    }

    if (!bundle.iap_product_id) {
      return jsonResponse({ error: 'This bundle cannot be purchased with cash yet.' }, 400);
    }

    if (!body.transactionId) {
      return jsonResponse({ error: 'transactionId required for cash purchases' }, 400);
    }

    let transactionId: string;
    try {
      transactionId = validateTransactionId(body.transactionId);
    } catch (err: any) {
      return jsonResponse({ error: err.message }, 400);
    }

    const existingPurchase = await env.DB
      .prepare('SELECT id FROM purchases WHERE transaction_id = ?')
      .bind(transactionId)
      .first<{ id: string }>();

    if (existingPurchase) {
      return jsonResponse({ error: 'Transaction already processed' }, 400);
    }

    let amountValue = bundle.price_crowns;
    if (typeof body.amount === 'number') {
      try {
        amountValue = validateAmount(body.amount);
      } catch (err: any) {
        return jsonResponse({ error: err.message }, 400);
      }
    }

    let verification = await verifyAppleTransaction(
      transactionId,
      bundle.iap_product_id,
      'Sandbox',
      body.receiptData
    );

    if (!verification.verified && body.receiptData) {
      verification = await verifyAppleReceipt(body.receiptData, bundle.iap_product_id, 'Sandbox');
    }

    if (!verification.verified) {
      return jsonResponse({
        error: verification.error || 'Unable to verify purchase',
      }, 400);
    }

    const purchaseId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO purchases (id, user_id, product_id, transaction_id, receipt_data, amount, currency, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        purchaseId,
        userId,
        bundle.iap_product_id,
        transactionId,
        body.receiptData || null,
        amountValue,
        'USD',
        1,
        Date.now()
      )
      .run();

    await applyBundleContents(env, userId, bundle.code, contents);

    return jsonResponse({
      success: true,
      bundleId: bundle.id,
      purchaseId,
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

