import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type * as BetterSqlite3 from 'better-sqlite3';

export interface SimulationConfig {
  levelThresholds: number[];
  econBaseline: number;
  tierTicks: Record<string, number>;
  policyBehavior: Record<string, PolicyBehavior>;
  buildingOutput: Record<string, Record<string, number>>;
  buildingBehavior: Record<string, { constructionOrder: string[]; desiredLevels: Record<string, number> }>;
  startingCity: StartingCityConfig;
  economyTargets: Record<string, number>;
  combatThresholds: {
    base_min_troops: number;
    mult_balanced: number;
    mult_militarist: number;
    mult_trader: number;
    militarist_training_mult: number;
  };
}

export interface PolicyBehavior {
  troopFocus: number;
  coinBuffer: number;
  rationBuffer: number;
  troopBatch: number;
}

export interface StartingCityConfig {
  coins: number;
  happiness: number;
  level: number;
  resources: Record<string, number>;
  populationRange: { min: number; variance: number };
  buildings: Record<string, any>;
}

const SEARCH_ROOTS = [
  path.resolve(__dirname, '../backend/.wrangler/state/v3/d1'),
  path.resolve(__dirname, '../backend/.wrangler/state/d1'),
  path.resolve(process.cwd(), '../backend/.wrangler/state/v3/d1'),
];

function findSqliteFile(dir: string, depth: number = 0): string | null {
  if (depth > 5 || !fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const nested = findSqliteFile(fullPath, depth + 1);
      if (nested) return nested;
    } else if (entry.endsWith('.sqlite')) {
      return fullPath;
    }
  }
  return null;
}

export function resolveDbPath(explicit?: string): string {
  if (explicit) {
    return path.resolve(explicit);
  }
  if (process.env.TOPPLAYER_D1_PATH) {
    return path.resolve(process.env.TOPPLAYER_D1_PATH);
  }
  for (const root of SEARCH_ROOTS) {
    const found = findSqliteFile(root);
    if (found) {
      return found;
    }
  }
  throw new Error(
    'Unable to locate the D1 database file. Pass --db <path> or set TOPPLAYER_D1_PATH to the sqlite file.'
  );
}

export function openDatabase(dbPath?: string): BetterSqlite3.Database {
  const resolved = resolveDbPath(dbPath);
  return new Database(resolved);
}

function loadGroup(db: BetterSqlite3.Database, code: string): Record<string, any> {
  try {
    const stmt = db.prepare(
      `SELECT v.key, v.value_json
       FROM sim_config_groups g
       JOIN sim_config_values v ON v.group_id = g.id
       WHERE g.code = ?`
    );
    const rows = stmt.all(code);
    const group: Record<string, any> = {};
    for (const row of rows) {
      try {
        group[row.key] = row.value_json ? JSON.parse(row.value_json) : null;
      } catch (err) {
        console.warn(`[cli/db] failed to parse config for ${code}:${row.key}`, err);
      }
    }
    return group;
  } catch (err) {
    console.warn(`[cli/db] config group ${code} missing, using defaults`);
    return {};
  }
}

export function loadSimulationConfig(db: BetterSqlite3.Database): SimulationConfig {
  const tierGroup = loadGroup(db, 'tier_pacing');
  const policyGroup = loadGroup(db, 'policy_profiles');
  const buildBehaviorGroup = loadGroup(db, 'building_behavior_overrides');
  const buildOutputGroup = loadGroup(db, 'building_output');
  const cityStartGroup = loadGroup(db, 'city_start');
  const economyGroup = loadGroup(db, 'economy_flags');

  return {
    levelThresholds: tierGroup.default?.levelThresholds || [],
    econBaseline: tierGroup.default?.econBaseline || 0,
    tierTicks: tierGroup.default?.tierTicks || {},
    policyBehavior: policyGroup,
    buildingOutput: buildOutputGroup.default || {},
    buildingBehavior: Object.fromEntries(
      Object.entries(buildBehaviorGroup).map(([policy, value]) => [
        policy,
        {
          constructionOrder: value?.constructionOrder || [],
          desiredLevels: value?.desiredLevels || {},
        },
      ])
    ),
    startingCity: cityStartGroup.default || {
      coins: 1200,
      happiness: 0.92,
      level: 1,
      resources: {},
      populationRange: { min: 150, variance: 80 },
      buildings: {},
    },
    economyTargets: economyGroup.default || {},
    combatThresholds: (loadGroup(db, 'cfg-balance') as any)?.combat_thresholds || {
        base_min_troops: 10,
        mult_balanced: 1.0,
        mult_militarist: 0.7,
        mult_trader: 1.3,
        militarist_training_mult: 1.5
    },
  };
}

export function insertSimRun(
  db: BetterSqlite3.Database,
  payload: { runId: string; scenario: Record<string, any>; results: any }
): void {
  const stmt = db.prepare(
    `INSERT INTO sim_run_metrics (id, run_at, scenario_json, results_json)
     VALUES (?, ?, ?, ?)`
  );
  stmt.run(
    payload.runId,
    Date.now(),
    JSON.stringify(payload.scenario),
    JSON.stringify(payload.results)
  );
}

export function updateSimRunAdjustments(
  db: BetterSqlite3.Database,
  runId: string,
  adjustments: Record<string, any>
): void {
  db.prepare('UPDATE sim_run_metrics SET adjustments_json = ? WHERE id = ?')
    .run(JSON.stringify(adjustments), runId);
}


