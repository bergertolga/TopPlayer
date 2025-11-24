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

async function getActiveEvents(db: D1Database) {
  const now = Date.now();
  const rows = await db
    .prepare('SELECT * FROM world_events WHERE starts_at <= ? AND ends_at >= ? ORDER BY ends_at ASC')
    .bind(now, now)
    .all();
  return rows?.results || [];
}

export async function handleWorldEvents(request: Request, env: Env): Promise<Response> {
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

  if (method === 'GET' && path === '/api/v1/world/events') {
    const events = await getActiveEvents(env.DB);
    const formatted = [];
    for (const event of events as any[]) {
      const participation = await env.DB
        .prepare('SELECT * FROM world_event_participants WHERE event_id = ? AND user_id = ?')
        .bind(event.id, userId)
        .first<{ progress: number; reward_claimed: number }>();
      formatted.push({
        ...event,
        metadata: JSON.parse(event.metadata_json || '{}'),
        progress: participation?.progress || 0,
        rewardClaimed: !!participation?.reward_claimed,
      });
    }
    return jsonResponse({ events: formatted });
  }

  if (method === 'POST' && path === '/api/v1/world/events/contribute') {
    const body = (await request.json()) as { eventId: string; amount: number };
    if (!body?.eventId) {
      return jsonResponse({ error: 'eventId required' }, 400);
    }
    const event = await env.DB
      .prepare('SELECT * FROM world_events WHERE id = ?')
      .bind(body.eventId)
      .first<{ id: string; metadata_json: string }>();
    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }
    const metadata = JSON.parse(event.metadata_json || '{}');
    let progressGain = 0;

    if (metadata.resource) {
      if (!body.amount || body.amount <= 0) {
        return jsonResponse({ error: 'amount required' }, 400);
      }
      const resourceRow = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind(metadata.resource).first<{ id: string }>();
      if (!resourceRow) {
        return jsonResponse({ error: 'Resource not found' }, 500);
      }
      const city = await env.DB.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
      if (!city) {
        return jsonResponse({ error: 'City not found' }, 404);
      }
      const stock = await env.DB
        .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, resourceRow.id)
        .first<{ amount: number }>();
      if (!stock || stock.amount < body.amount) {
        return jsonResponse({ error: 'Insufficient resources' }, 400);
      }
      await env.DB
        .prepare('UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?')
        .bind(body.amount, city.id, resourceRow.id)
        .run();
      progressGain = body.amount;
    } else if (metadata.troopRequired) {
      progressGain = metadata.troopRequired;
      // For now, just record contribution without deducting troops.
    } else {
      return jsonResponse({ error: 'Event contribution not configured' }, 400);
    }

    const existing = await env.DB
      .prepare('SELECT * FROM world_event_participants WHERE event_id = ? AND user_id = ?')
      .bind(event.id, userId)
      .first<{ id: string; progress: number }>();
    if (existing) {
      await env.DB
        .prepare('UPDATE world_event_participants SET progress = progress + ?, last_update = ? WHERE id = ?')
        .bind(progressGain, Date.now(), existing.id)
        .run();
    } else {
      await env.DB
        .prepare(
          'INSERT INTO world_event_participants (id, event_id, user_id, progress, reward_claimed, last_update) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .bind(crypto.randomUUID(), event.id, userId, progressGain, 0, Date.now())
        .run();
    }

    return jsonResponse({ success: true });
  }

  if (method === 'POST' && path === '/api/v1/world/events/claim') {
    const body = (await request.json()) as { eventId: string };
    if (!body?.eventId) {
      return jsonResponse({ error: 'eventId required' }, 400);
    }
    const event = await env.DB
      .prepare('SELECT * FROM world_events WHERE id = ?')
      .bind(body.eventId)
      .first<{ metadata_json: string }>();
    if (!event) {
      return jsonResponse({ error: 'Event not found' }, 404);
    }
    const metadata = event.metadata_json ? JSON.parse(event.metadata_json) : {};
    const participation = await env.DB
      .prepare('SELECT * FROM world_event_participants WHERE event_id = ? AND user_id = ?')
      .bind(body.eventId, userId)
      .first<{ id: string; progress: number; reward_claimed: number }>();
    if (!participation || participation.reward_claimed) {
      return jsonResponse({ error: 'No reward available' }, 400);
    }
    const goal = metadata.goal || metadata.troopRequired || 0;
    if (participation.progress < goal) {
      return jsonResponse({ error: 'Contribution goal not met' }, 400);
    }

    await env.DB
      .prepare('UPDATE world_event_participants SET reward_claimed = 1 WHERE id = ?')
      .bind(participation.id)
      .run();

    // TODO: grant rewards (coins, crowns, boosts). For now, return metadata.
    return jsonResponse({ success: true, rewards: metadata });
  }

  if (method === 'GET' && path === '/api/v1/npc/quests') {
    const rows = await env.DB.prepare('SELECT * FROM npc_quests').all();
    const quests = [];
    for (const quest of (rows?.results || []) as any[]) {
      const progress = await env.DB
        .prepare('SELECT * FROM npc_quest_progress WHERE quest_id = ? AND user_id = ?')
        .bind(quest.id, userId)
        .first<{ status: string; progress_json: string }>();
      quests.push({
        ...quest,
        requirements: JSON.parse(quest.requirements_json || '{}'),
        rewards: JSON.parse(quest.rewards_json || '{}'),
        status: progress?.status || 'available',
        progress: progress?.progress_json ? JSON.parse(progress.progress_json) : {},
      });
    }
    return jsonResponse({ quests });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

