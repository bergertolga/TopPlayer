import { Env } from '../types';
import { validateUserId } from '../utils/validation';

interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
}

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

async function ensureConversation(db: D1Database, userA: string, userB: string): Promise<Conversation> {
  const [low, high] = userA < userB ? [userA, userB] : [userB, userA];
  let convo = await db
    .prepare('SELECT * FROM dm_conversations WHERE participant_a = ? AND participant_b = ?')
    .bind(low, high)
    .first<Conversation>();
  if (convo) return convo;
  const newId = crypto.randomUUID();
  await db
    .prepare('INSERT INTO dm_conversations (id, participant_a, participant_b, created_at) VALUES (?, ?, ?, ?)')
    .bind(newId, low, high, Date.now())
    .run();
  return { id: newId, participant_a: low, participant_b: high };
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
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

  if (method === 'GET' && path === '/api/v1/chat/world') {
    const limit = Math.min(200, Number(url.searchParams.get('limit') ?? 50));
    const rows = await env.DB.prepare(
      `SELECT wm.*, u.username
       FROM world_messages wm
       LEFT JOIN users u ON wm.user_id = u.id
       ORDER BY wm.created_at DESC
       LIMIT ?`
    )
      .bind(limit)
      .all();
    return jsonResponse({ messages: rows?.results || [] });
  }

  if (method === 'POST' && path === '/api/v1/chat/world') {
    const body = (await request.json()) as { message: string };
    if (!body?.message || !body.message.trim()) {
      return jsonResponse({ error: 'Message required' }, 400);
    }
    await env.DB
      .prepare('INSERT INTO world_messages (id, user_id, message, created_at) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, body.message.trim().slice(0, 500), Date.now())
      .run();
    return jsonResponse({ success: true });
  }

  if (path === '/api/v1/chat/dm') {
    if (method === 'GET') {
      const partnerId = url.searchParams.get('partnerId');
      if (!partnerId) return jsonResponse({ error: 'partnerId required' }, 400);
      if (partnerId === userId) return jsonResponse({ error: 'Cannot DM yourself' }, 400);
      const convo = await ensureConversation(env.DB, userId, partnerId);
      const limit = Math.min(200, Number(url.searchParams.get('limit') ?? 50));
      const rows = await env.DB
        .prepare(
          `SELECT dm.*, u.username
           FROM dm_messages dm
           LEFT JOIN users u ON dm.sender_id = u.id
           WHERE dm.conversation_id = ?
           ORDER BY dm.created_at DESC
           LIMIT ?`
        )
        .bind(convo.id, limit)
        .all();
      return jsonResponse({ conversationId: convo.id, messages: rows?.results || [] });
    }

    if (method === 'POST') {
      const body = (await request.json()) as { partnerId: string; message: string };
      if (!body?.partnerId || body.partnerId === userId) {
        return jsonResponse({ error: 'Valid partnerId required' }, 400);
      }
      if (!body.message || !body.message.trim()) {
        return jsonResponse({ error: 'Message required' }, 400);
      }
      const convo = await ensureConversation(env.DB, userId, body.partnerId);
      await env.DB
        .prepare('INSERT INTO dm_messages (id, conversation_id, sender_id, message, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(crypto.randomUUID(), convo.id, userId, body.message.trim().slice(0, 500), Date.now())
        .run();
      return jsonResponse({ success: true, conversationId: convo.id });
    }
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

