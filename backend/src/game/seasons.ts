
import { Env } from '../types';
import { D1Database } from '@cloudflare/workers-types';
import { mutatePremiumWallet } from '../utils/premium';

export interface SeasonDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  duration_days: number;
  rules_json: string; // Parsed as SeasonRules
}

export interface SeasonRules {
  productionMultiplier?: number;
  happinessDecay?: number;
  spoilage?: number;
  troopUpkeep?: number;
  trainCost?: number;
  crisisThresholds?: Record<string, number>;
  legacyMultiplier?: number;
}

export interface SeasonInstance {
  id: string;
  definition_id: string;
  season_number: number;
  start_at: number;
  end_at: number;
  status: 'active' | 'ended' | 'archived';
  metadata_json: string;
}

export class SeasonManager {
  private static rulesCache: Map<string, SeasonRules> = new Map();
  private static activeSeasonCache: SeasonInstance | null = null;
  private static activeRulesCache: SeasonRules | null = null;
  private static lastCacheUpdate = 0;
  private static CACHE_TTL = 60000; // 1 minute

  static async getActiveSeason(db: D1Database): Promise<{ instance: SeasonInstance; rules: SeasonRules } | null> {
    const now = Date.now();
    if (this.activeSeasonCache && (now - this.lastCacheUpdate < this.CACHE_TTL)) {
      return { instance: this.activeSeasonCache, rules: this.activeRulesCache || {} };
    }

    const instance = await db.prepare(
      `SELECT * FROM season_instances WHERE status = 'active' ORDER BY season_number DESC LIMIT 1`
    ).first<SeasonInstance>();

    if (!instance) return null;

    const def = await db.prepare(
      `SELECT * FROM season_definitions WHERE id = ?`
    ).bind(instance.definition_id).first<SeasonDefinition>();

    if (!def) return null;

    const rules = JSON.parse(def.rules_json) as SeasonRules;
    
    this.activeSeasonCache = instance;
    this.activeRulesCache = rules;
    this.lastCacheUpdate = now;

    return { instance, rules };
  }

  static async checkSeasonTransition(env: Env): Promise<void> {
    const active = await this.getActiveSeason(env.DB);
    if (!active) return; // Should probably bootstrap if none exists, but for now skip

    const now = Date.now();
    if (now > active.instance.end_at) {
      console.log(`[SeasonManager] Season ${active.instance.season_number} ended. Transitioning...`);
      await this.endSeason(env, active.instance);
      await this.startNextSeason(env, active.instance.season_number + 1);
    }
  }

  static async endSeason(env: Env, instance: SeasonInstance): Promise<void> {
    // 1. Mark as ended
    await env.DB.prepare(`UPDATE season_instances SET status = 'ended' WHERE id = ?`).bind(instance.id).run();

    // 2. Calculate and Award Legacy Bonuses
    // This is a heavy operation, effectively a "soft reset"
    // For MVP, we'll iterate top players and grant bonuses
    
    // Fetch top 100 players by wealth/pop
    const topPlayers = await env.DB.prepare(`
      SELECT id, coins, population 
      FROM cities 
      ORDER BY (coins + (population * 10)) DESC 
      LIMIT 100
    `).all<{ id: string; coins: number; population: number }>();

    if (topPlayers.results) {
      const timestamp = Date.now();
      for (const player of topPlayers.results) {
        // Simple logic: 1% of coin wealth carries over as "Legacy Gold"
        const legacyGold = Math.floor(player.coins * 0.01);
        if (legacyGold > 0) {
           await env.DB.prepare(`
            INSERT INTO legacy_bonuses (user_id, season_number, bonus_type, value, source)
            VALUES (?, ?, 'start_resources', ?, 'wealth_carryover')
          `).bind(player.id, instance.season_number + 1, legacyGold).run();
        }
        
        // Record Stats
        await env.DB.prepare(`
            INSERT INTO user_season_stats (user_id, season_id, peak_population, peak_wealth, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).bind(player.id, instance.id, player.population, player.coins, timestamp).run();
      }
    }
    
    // 3. Wipe City Resources / Levels (Soft Reset)
    // Reduce all cities to level 1, population 100, minimal resources
    // In a real app, this would be batched or done lazily on login
    // For now, we'll just log it as a TODO for the actual reset worker
    console.log(`[SeasonManager] Season ${instance.id} finalized. Reset pending.`);
  }

  static async startNextSeason(env: Env, nextSeasonNumber: number): Promise<void> {
    // Pick next season definition (Cycle: Expansion -> Conflict -> Scarcity)
    const defs = await env.DB.prepare(`SELECT * FROM season_definitions ORDER BY code`).all<SeasonDefinition>();
    if (!defs.results || defs.results.length === 0) return;

    // Simple rotation
    const nextDefIndex = (nextSeasonNumber - 1) % defs.results.length;
    const nextDef = defs.results[nextDefIndex];
    const now = Date.now();
    const durationMs = nextDef.duration_days * 24 * 60 * 60 * 1000;

    await env.DB.prepare(`
      INSERT INTO season_instances (id, definition_id, season_number, start_at, end_at, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).bind(
      `season-${nextSeasonNumber}`,
      nextDef.id,
      nextSeasonNumber,
      now,
      now + durationMs
    ).run();

    // Invalidate cache
    this.activeSeasonCache = null;
    this.activeRulesCache = null;
    
    console.log(`[SeasonManager] Started Season ${nextSeasonNumber}: ${nextDef.name}`);
  }

  static async applyLegacyBonuses(db: D1Database, userId: string, seasonNumber: number): Promise<void> {
    // Check for unclaimed bonuses
    const bonuses = await db.prepare(`
      SELECT * FROM legacy_bonuses WHERE user_id = ? AND season_number = ?
    `).bind(userId, seasonNumber).all<{ bonus_type: string; value: number }>();

    if (!bonuses.results) return;

    for (const bonus of bonuses.results) {
        if (bonus.bonus_type === 'start_resources') {
            // Add to starting coins/resources
             await db.prepare(`
                UPDATE cities SET coins = coins + ? WHERE id = (SELECT id FROM cities WHERE user_id = ? LIMIT 1)
             `).bind(bonus.value, userId).run();
        }
        // Handle other types (production multipliers etc) via persistent user_modifiers table if it existed
    }
  }
}

