type ConfigCacheEntry = {
  value: Record<string, any>;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 60 * 1000;

export class ConfigLoader {
  private static cache: Map<string, ConfigCacheEntry> = new Map();

  private static async fetchGroup(db: D1Database, code: string): Promise<Record<string, any>> {
    const rows = await db
      .prepare(
        `SELECT v.key, v.value_json
         FROM sim_config_groups g
         JOIN sim_config_values v ON v.group_id = g.id
         WHERE g.code = ?`
      )
      .bind(code)
      .all<{ key: string; value_json: string }>();

    const config: Record<string, any> = {};
    for (const row of rows.results) {
      try {
        config[row.key] = row.value_json ? JSON.parse(row.value_json) : null;
      } catch (err) {
        console.warn(`[ConfigLoader] failed to parse config ${code}:${row.key}`, err);
      }
    }
    return config;
  }

  static async loadGroup(db: D1Database, code: string, opts: { ttlMs?: number } = {}): Promise<Record<string, any>> {
    const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
    const cached = this.cache.get(code);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const fresh = await this.fetchGroup(db, code);
    this.cache.set(code, { value: fresh, expiresAt: now + ttl });
    return fresh;
  }

  static invalidate(code?: string): void {
    if (code) {
      this.cache.delete(code);
    } else {
      this.cache.clear();
    }
  }

  static async getPolicyProfile(db: D1Database, policy: string): Promise<{
    troopFocus: number;
    coinBuffer: number;
    rationBuffer: number;
    troopBatch: number;
  }> {
    const policies = await this.loadGroup(db, 'policy_profiles');
    return (
      policies[policy] ?? {
        troopFocus: 0.25,
        coinBuffer: 200,
        rationBuffer: 25,
        troopBatch: 3,
      }
    );
  }

  static async getBuildingBehavior(db: D1Database, policy: string): Promise<{
    constructionOrder: string[];
    desiredLevels: Record<string, number>;
  }> {
    const group = await this.loadGroup(db, 'building_behavior_overrides');
    const defaultBehavior = group['default'] || {};
    const policyBehavior = group[policy] || {};
    return {
      constructionOrder: policyBehavior.constructionOrder ?? defaultBehavior.constructionOrder ?? [],
      desiredLevels: policyBehavior.desiredLevels ?? defaultBehavior.desiredLevels ?? {},
    };
  }

  static async getBuildingOutputs(db: D1Database): Promise<Record<string, Record<string, number>>> {
    const group = await this.loadGroup(db, 'building_output');
    return group['default'] || {};
  }

  static async getTierConfig(db: D1Database): Promise<{
    levelThresholds: number[];
    econBaseline: number;
    tierTicks: Record<string, number>;
  }> {
    const group = await this.loadGroup(db, 'tier_pacing');
    const entry = group['default'] || {};
    return {
      levelThresholds: entry.levelThresholds ?? [],
      econBaseline: entry.econBaseline ?? 0,
      tierTicks: entry.tierTicks ?? {},
    };
  }

  static async getCityStart(db: D1Database, policy: string): Promise<{
    level: number;
    populationRange: { min: number; variance: number };
    happiness: number;
    coins: number;
    resources: Record<string, number>;
    buildings: Record<string, any>;
  }> {
    const group = await this.loadGroup(db, 'city_start');
    const entry = group['default'] || {};
    const buildingMap = entry.buildings || {};
    const resolvedBuildings: Record<string, number> = {};
    for (const [code, config] of Object.entries(buildingMap)) {
      if (typeof config === 'number') {
        resolvedBuildings[code] = config;
      } else if (typeof config === 'object' && config !== null) {
        const fallback = typeof config.default === 'number' ? config.default : 0;
        resolvedBuildings[code] = typeof config[policy] === 'number' ? config[policy] : fallback;
      }
    }
    return {
      level: entry.level ?? 1,
      populationRange: entry.populationRange ?? { min: 100, variance: 50 },
      happiness: entry.happiness ?? 0.9,
      coins: entry.coins ?? 1000,
      resources: entry.resources ?? {},
      buildings: resolvedBuildings,
    };
  }

  static async getBalanceRules(db: D1Database): Promise<{
    production: { baseMultiplierPerLevel: number };
    refining: { baseEfficiency: number; efficiencyPerLevel: number };
    happiness: { foodDeficitPenalty: number; fabricDeficitPenalty: number; festivalBonus: number; min: number; max: number };
    warehouse: { baseCapacity: number; capacityMultiplier: number };
  }> {
    const group = await this.loadGroup(db, 'balance_rules');
    const entry = group['default'] || {};
    return {
      production: entry.production ?? { baseMultiplierPerLevel: 0.15 },
      refining: entry.refining ?? { baseEfficiency: 0.9, efficiencyPerLevel: 0.02 },
      happiness: entry.happiness ?? { foodDeficitPenalty: -0.1, fabricDeficitPenalty: -0.05, festivalBonus: 0.02, min: 0, max: 1 },
      warehouse: entry.warehouse ?? { baseCapacity: 5000, capacityMultiplier: 1.5 },
    };
  }
}


