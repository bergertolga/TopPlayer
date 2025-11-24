import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';

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

export async function handleContracts(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let userId: string;
  try {
    userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/contracts') {
    const available = await env.DB.prepare(
      `SELECT c.*, COALESCE(uc.status, 'available') as user_status, COALESCE(uc.progress, 0) as progress
       FROM capital_contracts c
       LEFT JOIN user_contracts uc ON uc.contract_id = c.id AND uc.user_id = ?
       ORDER BY c.chapter ASC, c.title ASC`
    )
      .bind(userId)
      .all();

    return jsonResponse({ contracts: available.results }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/contracts/accept') {
    const body = await request.json() as { contractId: string };

    const contract = await env.DB.prepare(
      'SELECT * FROM capital_contracts WHERE id = ?'
    )
      .bind(body.contractId)
      .first();

    if (!contract) {
      return jsonResponse({ error: 'Contract not found' }, 404, corsHeaders);
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM user_contracts WHERE user_id = ? AND contract_id = ?'
    )
      .bind(userId, body.contractId)
      .first();

    if (existing && (existing as any).status === 'completed') {
      return jsonResponse({ error: 'Contract already completed' }, 400, corsHeaders);
    }

    if (existing && (existing as any).status === 'active') {
      return jsonResponse({ error: 'Contract already active' }, 400, corsHeaders);
    }

    await env.DB.prepare(
      'INSERT INTO user_contracts (id, user_id, contract_id, status, progress, accepted_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), userId, body.contractId, 'active', 0, Date.now())
      .run();

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/contracts/submit') {
    const body = await request.json() as { contractId: string; amount: number };

    const contract = await env.DB.prepare(
      'SELECT * FROM capital_contracts WHERE id = ?'
    )
      .bind(body.contractId)
      .first<{ resource_code: string; amount_required: number; reward_coins: number }>();

    if (!contract) {
      return jsonResponse({ error: 'Contract not found' }, 404, corsHeaders);
    }

    const userContract = await env.DB.prepare(
      'SELECT * FROM user_contracts WHERE user_id = ? AND contract_id = ?'
    )
      .bind(userId, body.contractId)
      .first<{ id: string; status: string; progress: number }>();

    if (!userContract || userContract.status !== 'active') {
      return jsonResponse({ error: 'Contract not active' }, 400, corsHeaders);
    }

    const city = await env.DB.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    const resourceRow = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind(contract.resource_code)
      .first<{ id: string }>();

    if (!resourceRow) {
      return jsonResponse({ error: 'Resource not found' }, 404, corsHeaders);
    }

    const cityResource = await env.DB.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    )
      .bind(city.id, resourceRow.id)
      .first<{ amount: number }>();

    if (!cityResource || cityResource.amount < body.amount) {
      return jsonResponse({ error: 'Insufficient resources' }, 400, corsHeaders);
    }

    const newProgress = Math.min(contract.amount_required, userContract.progress + body.amount);

    await env.DB.prepare(
      'UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?'
    )
      .bind(body.amount, city.id, resourceRow.id)
      .run();

    const status = newProgress >= contract.amount_required ? 'completed' : 'active';
    const completedAt = status === 'completed' ? Date.now() : null;

    await env.DB.prepare(
      'UPDATE user_contracts SET progress = ?, status = ?, completed_at = ? WHERE id = ?'
    )
      .bind(newProgress, status, completedAt, userContract.id)
      .run();

    if (status === 'completed') {
      const coinsResource = await env.DB.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind('COINS')
        .first<{ id: string }>();

      if (coinsResource) {
        const existingCoins = await env.DB.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        )
          .bind(city.id, coinsResource.id)
          .first<{ amount: number }>();

        const currentCoins = Math.max(0, existingCoins?.amount || 0);
        const newCoins = currentCoins + contract.reward_coins;

        await env.DB.prepare(
          `INSERT INTO city_resources (city_id, resource_id, amount, protected)
           VALUES (?, ?, ?, 0)
           ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
        )
          .bind(city.id, coinsResource.id, newCoins, newCoins)
          .run();
      }
    }

    return jsonResponse({
      success: true,
      progress: newProgress,
      status,
    }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

