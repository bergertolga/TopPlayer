
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestRuntime, type TestRuntime } from './helpers/runtime';
import { EventManager } from '../src/game/events';
import { mutatePremiumWallet, getPremiumWallet } from '../src/utils/premium';

describe('Phase 2 Content', () => {
  let runtime: TestRuntime | undefined;

  beforeEach(async () => {
    runtime = await createTestRuntime();
    // Seed new content tables explicitly if migration doesn't run in test context
    // But createTestRuntime usually applies migrations. 
    // We might need to manually insert seed data if the test DB is empty.
    
    // Seed test user
    await runtime!.db.prepare(
      "INSERT INTO users (id, username, email, created_at, last_active) VALUES ('u1', 'testuser', 'test@test.com', ?, ?)"
    ).bind(Date.now(), Date.now()).run();
  });

  afterEach(async () => {
    if (runtime) {
      await runtime.dispose();
      runtime = undefined;
    }
  });

  describe('Events & Leaderboards', () => {
    it('activates events and tracks participation', async () => {
      const db = runtime!.db;
      const now = Date.now();

      // Create event definition
      await db.prepare(
        `INSERT INTO event_definitions (id, code, type, name, description, scoring_config_json, rewards_json)
         VALUES ('def1', 'TEST_EVENT', 'personal_production', 'Test Event', 'Desc', '{"metric":"coins"}', '{"rank_1":{"crowns":100}}')`
      ).run();

      // Create upcoming instance
      await db.prepare(
        `INSERT INTO event_instances (id, definition_id, start_at, end_at, status)
         VALUES ('inst1', 'def1', ?, ?, 'upcoming')`
      ).bind(now - 1000, now + 10000).run();

      // Process events -> should activate
      await EventManager.processEvents({ DB: db } as any);
      
      const active = await EventManager.getActiveEvents(db);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('inst1');

      // Record score
      await EventManager.recordScore(db, 'inst1', 'u1', 'user', 500);
      
      const part = await db.prepare("SELECT score FROM event_participation WHERE participant_id = 'u1'").first<{score: number}>();
      expect(part?.score).toBe(500);

      // Record more score
      await EventManager.recordScore(db, 'inst1', 'u1', 'user', 250);
      const part2 = await db.prepare("SELECT score FROM event_participation WHERE participant_id = 'u1'").first<{score: number}>();
      expect(part2?.score).toBe(750);
    });
  });

  describe('Premium Wallet', () => {
    it('handles currency mutations safely', async () => {
      const db = runtime!.db;
      
      // Initial state
      const w1 = await getPremiumWallet(db, 'u1');
      expect(w1.crowns).toBe(0);

      // Add crowns
      await mutatePremiumWallet(db, 'u1', { crowns: 100 }, { reason: 'test_gift' });
      const w2 = await getPremiumWallet(db, 'u1');
      expect(w2.crowns).toBe(100);

      // Spend crowns
      await mutatePremiumWallet(db, 'u1', { crowns: -40 }, { reason: 'test_spend' });
      const w3 = await getPremiumWallet(db, 'u1');
      expect(w3.crowns).toBe(60);

      // Check ledger
      const ledger = await db.prepare("SELECT * FROM premium_ledger WHERE user_id = 'u1' ORDER BY created_at").all();
      expect(ledger.results).toHaveLength(2);
      expect((ledger.results[0] as any).delta_crowns).toBe(100);
      expect((ledger.results[1] as any).delta_crowns).toBe(-40);
    });

    it('prevents negative balance (clamped at 0)', async () => {
      const db = runtime!.db;
      await mutatePremiumWallet(db, 'u1', { crowns: 10 }, { reason: 'small_gift' });
      await mutatePremiumWallet(db, 'u1', { crowns: -50 }, { reason: 'overspend' });
      
      const w = await getPremiumWallet(db, 'u1');
      expect(w.crowns).toBe(0);
    });
  });
});

