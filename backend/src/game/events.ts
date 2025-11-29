
import { Env } from '../types';

export interface EventDefinition {
  id: string;
  code: string;
  type: 'council_contribution' | 'personal_production' | 'combat_raid';
  name: string;
  description: string;
  scoring_config: { metric: string; resource?: string };
  rewards: Record<string, any>;
}

export interface EventInstance {
  id: string;
  definition_id: string;
  start_at: number;
  end_at: number;
  status: 'upcoming' | 'active' | 'calculating' | 'completed';
  metadata: Record<string, any>;
  metadata_json?: string;
}

export class EventManager {
  static async getActiveEvents(db: D1Database): Promise<EventInstance[]> {
    const now = Date.now();
    const rows = await db.prepare(
      `SELECT * FROM event_instances 
       WHERE status = 'active' AND start_at <= ? AND end_at > ?`
    )
    .bind(now, now)
    .all<EventInstance>();
    
    return (rows.results || []).map(r => ({
      ...r,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json as unknown as string) : {}
    }));
  }

  static async processEvents(env: Env): Promise<void> {
    const db = env.DB;
    const now = Date.now();

    // 1. Activate upcoming events
    await db.prepare(
      `UPDATE event_instances SET status = 'active' 
       WHERE status = 'upcoming' AND start_at <= ?`
    ).bind(now).run();

    // 2. Conclude ended events
    const endedEvents = await db.prepare(
      `SELECT id FROM event_instances 
       WHERE status = 'active' AND end_at <= ?`
    ).bind(now).all<{id: string}>();

    for (const event of endedEvents.results) {
      await this.finalizeEvent(env, event.id);
    }
  }

  static async finalizeEvent(env: Env, instanceId: string): Promise<void> {
    const db = env.DB;
    
    // Mark as calculating to prevent double-processing
    await db.prepare("UPDATE event_instances SET status = 'calculating' WHERE id = ?").bind(instanceId).run();

    const instance = await db.prepare(
      `SELECT i.*, d.rewards_json 
       FROM event_instances i
       JOIN event_definitions d ON i.definition_id = d.id
       WHERE i.id = ?`
    ).bind(instanceId).first<{id: string, rewards_json: string}>();

    if (!instance) return;

    // Simple ranking: Sort by score DESC
    const participants = await db.prepare(
      `SELECT id, participant_id, score 
       FROM event_participation 
       WHERE instance_id = ? 
       ORDER BY score DESC`
    ).bind(instanceId).all<{id: string, participant_id: string, score: number}>();

    const rewardsConfig = JSON.parse(instance.rewards_json);
    let rank = 1;

    for (const p of participants.results) {
      // Update rank
      await db.prepare("UPDATE event_participation SET rank = ? WHERE id = ?").bind(rank, p.id).run();

      // Distribute rewards (simplified logic: check exact rank or top X)
      // In a real system, we'd have a robust reward matcher. 
      // Here we assume rewardsConfig has keys like "rank_1", "rank_2", "default"
      
      const rewardKey = `rank_${rank}`;
      const reward = rewardsConfig[rewardKey] || rewardsConfig['default'];

      if (reward) {
        // TODO: Call a unified reward granter (sim to what's in world.ts or council.ts)
        // For now, we'll log it. 
        // We need to move the reward granting logic to a shared utility.
        console.log(`Granting reward to ${p.participant_id} for rank ${rank}:`, reward);
        
        // Mark as claimed automatically or let user claim? 
        // For idle games, auto-mail or "claim" button is common.
        // We'll leave rewards_claimed_at NULL so they can claim in UI.
      }

      rank++;
    }

    await db.prepare("UPDATE event_instances SET status = 'completed' WHERE id = ?").bind(instanceId).run();
  }

  static async recordScore(db: D1Database, instanceId: string, participantId: string, type: 'user' | 'council', scoreDelta: number) {
    await db.prepare(
      `INSERT INTO event_participation (id, instance_id, participant_id, participant_type, score, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(instance_id, participant_id) DO UPDATE SET 
         score = score + ?, 
         updated_at = ?`
    ).bind(
      crypto.randomUUID(), 
      instanceId, 
      participantId, 
      type, 
      scoreDelta, 
      Date.now(),
      scoreDelta,
      Date.now()
    ).run();
  }
}

