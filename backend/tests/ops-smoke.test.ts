import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Miniflare } from 'miniflare';
import type { Env } from '../src/types';
import type { D1Database } from '@cloudflare/workers-types';
import { handleShop } from '../src/api/v1/shop';
import { handleChat } from '../src/api/chat';

describe('Ops smoke: analytics + chat + premium stipend', () => {
  let mf: Miniflare;
  let env: Env;

  beforeEach(async () => {
    mf = new Miniflare({
      modules: true,
      script: 'export default { async fetch() { return new Response("ok"); } }',
      compatibilityDate: '2024-01-01',
      d1Databases: ['DB'],
    });
    const db = await mf.getD1Database('DB');
    await seedSchema(db);
    env = { DB: db } as any;
  });

  afterEach(async () => {
    await mf.dispose();
  });

  async function seedSchema(db: D1Database) {
    await db.prepare('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, email TEXT, created_at INTEGER, last_active INTEGER)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS premium_currencies (user_id TEXT PRIMARY KEY, crowns INTEGER, gems INTEGER, favor INTEGER, last_stipend_claim INTEGER, updated_at INTEGER)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS premium_ledger (id TEXT PRIMARY KEY, user_id TEXT, delta_crowns INTEGER, delta_gems INTEGER, delta_favor INTEGER, reason TEXT, metadata_json TEXT, created_at INTEGER)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS analytics_events (id TEXT PRIMARY KEY, user_id TEXT, event_type TEXT, event_data TEXT, created_at INTEGER)').run();
    await db.prepare('CREATE TABLE IF NOT EXISTS world_messages (id TEXT PRIMARY KEY, user_id TEXT, message TEXT, created_at INTEGER)').run();
  }

  async function seedUser(username = 'ops-smoke'): Promise<string> {
    const userId = randomUUID();
    const now = Date.now();
    await env.DB.prepare('INSERT INTO users (id, username, email, created_at, last_active) VALUES (?, ?, ?, ?, ?)')
      .bind(userId, username, `${username}@test.dev`, now, now)
      .run();
    return userId;
  }

  it('records analytics for stipend and world chat', async () => {
    const userId = await seedUser();

    const stipendReq = new Request('http://localhost/api/v1/premium/stipend', {
      method: 'POST',
      headers: { 'X-User-ID': userId, 'Content-Type': 'application/json' },
    });
    const stipendRes = await handleShop(stipendReq, env);
    expect(stipendRes.status).toBe(200);

    const chatReq = new Request('http://localhost/api/v1/chat/world', {
      method: 'POST',
      headers: { 'X-User-ID': userId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello realm' }),
    });
    const chatRes = await handleChat(chatReq, env);
    expect(chatRes.status).toBe(200);

    const rows = await env.DB.prepare('SELECT event_type FROM analytics_events WHERE user_id = ?').bind(userId).all();
    const types = (rows?.results || []).map((r: any) => r.event_type);

    expect(types).toContain('premium_stipend_claim');
    expect(types).toContain('world_chat_post');
  });
});


