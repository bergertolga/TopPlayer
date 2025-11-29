import { Env } from '../types';
import { validateUserId } from '../utils/validation';

async function resolveCouncilId(db: D1Database, userId: string, explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const membership = await db
    .prepare('SELECT council_id FROM council_members WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first<{ council_id: string }>();
  return membership?.council_id || null;
}

async function fetchCouncilBuffs(db: D1Database, councilId: string): Promise<Record<string, any>> {
  const buffs: Record<string, any> = {};

  const techBuffs = await db
    .prepare(
      `SELECT tp.status, tt.buff_json
       FROM council_tech_progress tp
       JOIN council_tech_tree tt ON tp.tech_id = tt.id
       WHERE tp.council_id = ?`
    )
    .bind(councilId)
    .all<{ status: string; buff_json: string }>();

  for (const entry of techBuffs.results) {
    if (entry.status !== 'completed' || !entry.buff_json) continue;
    Object.assign(buffs, { ...buffs, ...JSON.parse(entry.buff_json) });
  }

  const projectBuffs = await db
    .prepare(
      `SELECT cp.status, pd.buff_json
       FROM council_projects cp
       JOIN council_project_defs pd ON cp.project_def_id = pd.id
       WHERE cp.council_id = ?`
    )
    .bind(councilId)
    .all<{ status: string; buff_json: string }>();

  for (const entry of projectBuffs.results) {
    if (entry.status !== 'completed' || !entry.buff_json) continue;
    Object.assign(buffs, { ...buffs, ...JSON.parse(entry.buff_json) });
  }

  return buffs;
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
    const council = await env.DB
      .prepare(
        `SELECT c.id, c.name, c.guild_code, c.region_id
         FROM council_members cm
         JOIN councils c ON cm.council_id = c.id
         WHERE cm.user_id = ?
         LIMIT 1`
      )
      .bind(userId)
      .first<{ id: string; name: string; guild_code: string | null; region_id: string }>();

    return jsonResponse({
      guilds: (guilds?.results || []).map((g: any) => ({
        code: g.code,
        name: g.name,
        description: g.description,
        perks: JSON.parse(g.perk_json || '{}'),
      })),
      council: council
        ? {
            id: council.id,
            name: council.name,
            guildCode: council.guild_code,
            regionId: council.region_id,
          }
        : null,
    });
  }

  if (method === 'GET' && path === '/api/v1/council/tech') {
    const councilId = await resolveCouncilId(env.DB, userId, url.searchParams.get('councilId') || undefined);
    if (!councilId) {
      return jsonResponse({ error: 'Council not found for user' }, 404);
    }

    const techRows = await env.DB
      .prepare(
        `SELECT tt.id, tt.code, tt.name, tt.description, tt.tier, tt.cost_json, tt.buff_json,
                tp.status, tp.progress, tp.contributed_resources_json
         FROM council_tech_tree tt
         LEFT JOIN council_tech_progress tp
           ON tp.tech_id = tt.id AND tp.council_id = ?
         ORDER BY tt.tier, tt.code`
      )
      .bind(councilId)
      .all<{
        id: string;
        code: string;
        name: string;
        description: string;
        tier: number;
        cost_json: string;
        buff_json: string;
        status: string | null;
        progress: number | null;
        contributed_resources_json: string | null;
      }>();

    const contributions = await env.DB
      .prepare(
        `SELECT cmc.user_id, u.username, SUM(cmc.amount) AS total_amount, COUNT(*) AS entries
         FROM council_member_contributions cmc
         LEFT JOIN users u ON u.id = cmc.user_id
         WHERE cmc.council_id = ? AND cmc.contribution_type = 'tech'
         GROUP BY cmc.user_id, u.username
         ORDER BY total_amount DESC`
      )
      .bind(councilId)
      .all<{ user_id: string; username: string | null; total_amount: number; entries: number }>();

    const prestige = await env.DB
      .prepare('SELECT * FROM council_prestige WHERE council_id = ?')
      .bind(councilId)
      .first<{ season: string; prestige_score: number; rank: number | null; buffs_json: string }>();

    const projects = await env.DB
      .prepare(
        `SELECT cp.id, cp.status, cp.progress, cp.contributed_resources_json, cp.started_at, cp.completed_at,
                pd.code, pd.name, pd.required_resources_json, pd.buff_json
         FROM council_projects cp
         JOIN council_project_defs pd ON cp.project_def_id = pd.id
         WHERE cp.council_id = ?
         ORDER BY cp.started_at DESC`
      )
      .bind(councilId)
      .all<{
        id: string;
        status: string;
        progress: number;
        contributed_resources_json: string;
        started_at: number;
        completed_at: number | null;
        code: string;
        name: string;
        required_resources_json: string;
        buff_json: string;
      }>();

    const buffs = await fetchCouncilBuffs(env.DB, councilId);

    return jsonResponse({
      councilId,
      tech: techRows.results.map((row) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        description: row.description,
        tier: row.tier,
        cost: JSON.parse(row.cost_json || '{}'),
        buff: row.buff_json ? JSON.parse(row.buff_json) : {},
        status: row.status || 'locked',
        progress: row.progress ?? 0,
        contributions: row.contributed_resources_json ? JSON.parse(row.contributed_resources_json) : {},
      })),
      contributions: contributions.results.map((entry) => ({
        userId: entry.user_id,
        username: entry.username,
        total: entry.total_amount,
        entries: entry.entries,
      })),
      projects: projects.results.map((project) => ({
        id: project.id,
        code: project.code,
        name: project.name,
        status: project.status,
        progress: project.progress,
        requirements: JSON.parse(project.required_resources_json || '{}'),
        contributions: JSON.parse(project.contributed_resources_json || '{}'),
        buff: project.buff_json ? JSON.parse(project.buff_json) : {},
        startedAt: project.started_at,
        completedAt: project.completed_at,
      })),
      prestige: prestige
        ? {
            season: prestige.season,
            score: prestige.prestige_score,
            rank: prestige.rank,
            buffs: prestige.buffs_json ? JSON.parse(prestige.buffs_json) : {},
          }
        : null,
      activeBuffs: buffs,
    });
  }

  if (path === '/api/v1/council/chat') {
    const councilId = await resolveCouncilId(env.DB, userId, url.searchParams.get('councilId') || undefined);
    if (!councilId) {
      return jsonResponse({ error: 'Council not found for user' }, 404);
    }

    if (method === 'GET') {
      const limit = Math.min(100, Number(url.searchParams.get('limit') || 50));
      const messages = await env.DB
        .prepare(
          `SELECT ccl.*, u.username
           FROM council_chat_log ccl
           LEFT JOIN users u ON u.id = ccl.user_id
           WHERE ccl.council_id = ?
           ORDER BY ccl.created_at DESC
           LIMIT ?`
        )
        .bind(councilId, limit)
        .all<{ id: string; user_id: string; username: string | null; message: string; metadata_json: string | null; created_at: number }>();

      return jsonResponse({
        councilId,
        messages: messages.results.map((msg) => ({
          id: msg.id,
          userId: msg.user_id,
          username: msg.username,
          message: msg.message,
          metadata: msg.metadata_json ? JSON.parse(msg.metadata_json) : null,
          createdAt: msg.created_at,
        })),
      });
    }

    if (method === 'POST') {
      const membership = await env.DB
        .prepare('SELECT role FROM council_members WHERE council_id = ? AND user_id = ?')
        .bind(councilId, userId)
        .first<{ role: string }>();

      if (!membership) {
        return jsonResponse({ error: 'User is not part of council' }, 403);
      }

      const body = await request.json<{ message?: string; metadata?: Record<string, any> }>();
      if (!body?.message || body.message.trim().length === 0) {
        return jsonResponse({ error: 'Message is required' }, 400);
      }

      const now = Date.now();
      const messageId = crypto.randomUUID();
      await env.DB
        .prepare(
          `INSERT INTO council_chat_log (id, council_id, user_id, username, message, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          messageId,
          councilId,
          userId,
          null,
          body.message.trim(),
          body.metadata ? JSON.stringify(body.metadata) : null,
          now
        )
        .run();

      return jsonResponse({ ok: true, id: messageId, createdAt: now }, 201);
    }
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

