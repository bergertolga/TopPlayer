
import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';
import { EventManager } from '../../game/events';

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

export async function handleEvents(request: Request, env: Env): Promise<Response> {
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

  if (method === 'GET' && path === '/api/v1/events/active') {
    const active = await EventManager.getActiveEvents(env.DB);
    const participation = await env.DB.prepare(
      `SELECT instance_id, score, rank, rewards_claimed_at 
       FROM event_participation 
       WHERE participant_id = ? AND instance_id IN (SELECT id FROM event_instances WHERE status = 'active')`
    ).bind(userId).all<{instance_id: string, score: number, rank: number, rewards_claimed_at: number}>();

    const myStats: Record<string, any> = {};
    participation.results.forEach(p => {
      myStats[p.instance_id] = { score: p.score, rank: p.rank, claimed: !!p.rewards_claimed_at };
    });

    return jsonResponse({
      events: active.map(e => ({
        id: e.id,
        definitionId: e.definition_id,
        startAt: e.start_at,
        endAt: e.end_at,
        metadata: e.metadata,
        myScore: myStats[e.id]?.score || 0,
        myRank: myStats[e.id]?.rank || null
      }))
    });
  }

  if (method === 'GET' && path === '/api/v1/events/leaderboard') {
    const instanceId = url.searchParams.get('instanceId');
    if (!instanceId) return jsonResponse({ error: 'instanceId required' }, 400);

    const limit = Math.min(100, Number(url.searchParams.get('limit') || 50));
    const offset = Number(url.searchParams.get('offset') || 0);

    const rows = await env.DB.prepare(
      `SELECT ep.score, ep.rank, u.username, c.name as council_name
       FROM event_participation ep
       LEFT JOIN users u ON ep.participant_type = 'user' AND u.id = ep.participant_id
       LEFT JOIN councils c ON ep.participant_type = 'council' AND c.id = ep.participant_id
       WHERE ep.instance_id = ?
       ORDER BY ep.score DESC
       LIMIT ? OFFSET ?`
    ).bind(instanceId, limit, offset).all();
    
    return jsonResponse({
      instanceId,
      rankings: rows.results.map((r: any) => ({
        name: r.username || r.council_name || 'Unknown',
        score: r.score,
        rank: r.rank
      }))
    });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
