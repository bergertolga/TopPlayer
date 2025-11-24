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
    return jsonResponse({
      king: {
        name: 'King Aurelius',
        decree: announcement?.title || 'Hold fast, citizens!',
        message: announcement?.body || 'The capital thrives thanks to your contributions.',
        issuedAt: announcement?.created_at || Date.now(),
      },
      favorPoints: stats.favor_points,
      actions: [
        { code: 'donate_coins', costCoins: 500, reward: 5 },
        { code: 'donate_food', resource: 'FOOD', amount: 600, reward: 4 },
      ],
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

  return jsonResponse({ error: 'Not found' }, 404);
}

