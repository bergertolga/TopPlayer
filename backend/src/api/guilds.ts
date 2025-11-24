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

export async function handleGuilds(request: Request, env: Env): Promise<Response> {
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

  if (method === 'GET' && path === '/api/v1/guilds') {
    const guilds = await env.DB.prepare('SELECT * FROM guild_archetypes').all();
    const membership = await env.DB
      .prepare('SELECT * FROM guild_membership WHERE user_id = ?')
      .bind(userId)
      .first<{ guild_code: string; joined_at: number }>();
    return jsonResponse({
      guilds: (guilds?.results || []).map((g: any) => ({
        code: g.code,
        name: g.name,
        description: g.description,
        perks: JSON.parse(g.perk_json || '{}'),
        isMember: membership?.guild_code === g.code,
      })),
      membership,
    });
  }

  if (method === 'POST' && path === '/api/v1/guilds/join') {
    const body = (await request.json()) as { guildCode: string };
    if (!body?.guildCode) {
      return jsonResponse({ error: 'guildCode required' }, 400);
    }
    const guild = await env.DB
      .prepare('SELECT * FROM guild_archetypes WHERE code = ?')
      .bind(body.guildCode)
      .first();
    if (!guild) {
      return jsonResponse({ error: 'Guild not found' }, 404);
    }
    await env.DB
      .prepare(
        `INSERT INTO guild_membership (user_id, guild_code, joined_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET guild_code = excluded.guild_code, joined_at = excluded.joined_at`
      )
      .bind(userId, body.guildCode, Date.now())
      .run();
    return jsonResponse({ success: true, guild: guild.code });
  }

  if (method === 'POST' && path === '/api/v1/guilds/leave') {
    await env.DB.prepare('DELETE FROM guild_membership WHERE user_id = ?').bind(userId).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

