#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { openDatabase, loadSimulationConfig, insertSimRun, SimulationConfig, PolicyBehavior as ConfigPolicyBehavior } from '../db';

type Policy = 'balanced' | 'militarist' | 'trader';
type PolicyInput = Policy | 'diversified';
type Tier = 'Settlement' | 'Hamlet' | 'Town' | 'City';

interface SimOptions {
  players: number;
  ticks: number;
  sampleEvery: number;
  policy: PolicyInput;
  seasons: number; // Number of seasons to run
  out?: string;
  dbPath?: string;
}

interface SimCityState {
  id: number;
  policy: Policy;
  level: number;
  tier: Tier;
  population: number;
  coins: number;
  resources: Record<string, number>;
  troops: Record<string, number>;
  happiness: number;
  ticksInTier: number;
  buildings: Record<string, number>;
  tierTimeline: Record<Tier, number | undefined>;
  rng: () => number;
  // Seasonal extensions
  season: number;
  legacyBonuses: Record<string, number>; // e.g., starting gold from prev season
}

interface CityResult {
  playerId: string;
  summary: {
    policy: Policy;
    finalTier: Tier;
    ticksToTier: Record<Tier, number | null>;
    totalUnits: number;
    totalBuildings: number;
    surplus: Record<string, number>;
  };
  timeline: Array<{
    tick: number;
    tier: Tier;
    resources: Record<string, number>;
    totalUnits: number;
    coins: number;
    grain: number;
    timber: number;
    stone: number;
    rations: number;
    season: number; // Added
  }>;
}

const DEFAULT_OPTIONS: SimOptions = {
  players: 25,
  ticks: 2000,
  sampleEvery: 50,
  policy: 'balanced',
  seasons: 1,
};

const RESOURCE_KEYS = ['FOOD', 'WOOD', 'STONE', 'RATIONS', 'FIBER'] as const;

type PolicyBehavior = ConfigPolicyBehavior;

interface RuntimeConfig {
  levelThresholds: number[];
  econBaseline: number;
  tierTicks: Record<Tier, number>;
  policyBehavior: Record<Policy, PolicyBehavior>;
  buildingOutput: Record<string, Record<string, number>>;
  buildingBehavior: Record<Policy | 'default', { order: string[]; desiredLevels: Record<string, number> }>;
  startingCity: StartingCityConfig;
  economyTargets: Record<string, number>;
}

interface StartingCityConfig {
  level: number;
  populationRange: { min: number; variance: number };
  happiness: number;
  coins: number;
  resources: Record<string, number>;
  buildings: Record<string, any>;
}

const DEFAULT_LEVEL_THRESHOLDS = [0, 220, 650, 2100, 5200, 9000, 14000, 20000, 27000, 34000];
const DEFAULT_ECON_BASELINE = 360;
const DEFAULT_TIER_TICKS: Record<Tier, number> = {
  Settlement: 55,
  Hamlet: 160,
  Town: 240,
  City: 0,
};
const DEFAULT_BUILDING_OUTPUT: Record<string, Record<string, number>> = {
  farm: { FOOD: 3 },
  lumber_mill: { WOOD: 2 },
  quarry: { STONE: 2 },
  market: {},
  warehouse: {},
  barracks: {},
  rations_kitchen: {},
};

const DEFAULT_BUILDING_ORDER: Record<Policy, string[]> = {
  balanced: ['rations_kitchen', 'farm', 'lumber_mill', 'quarry', 'barracks', 'market', 'warehouse'],
  militarist: ['rations_kitchen', 'barracks', 'farm', 'lumber_mill', 'quarry', 'market'],
  trader: ['market', 'warehouse', 'farm', 'lumber_mill', 'quarry', 'rations_kitchen'],
};

const DEFAULT_POLICY_BEHAVIOR: Record<Policy, PolicyBehavior> = {
  balanced: { troopFocus: 0.27, coinBuffer: 180, rationBuffer: 28, troopBatch: 4 },
  militarist: { troopFocus: 0.58, coinBuffer: 140, rationBuffer: 22, troopBatch: 6 },
  trader: { troopFocus: 0.1, coinBuffer: 280, rationBuffer: 20, troopBatch: 2 },
};

const DEFAULT_STARTING_CITY: StartingCityConfig = {
  level: 1,
  populationRange: { min: 150, variance: 80 },
  happiness: 0.92,
  coins: 1200,
  resources: {
    FOOD: 320,
    WOOD: 200,
    STONE: 160,
    RATIONS: 60,
    FIBER: 100,
  },
  buildings: {
    farm: { balanced: 3, militarist: 2, trader: 3, default: 3 },
    lumber_mill: 1,
    quarry: 1,
    market: { trader: 2, default: 1 },
    warehouse: { trader: 2, default: 1 },
    rations_kitchen: { trader: 0, default: 1 },
    barracks: { militarist: 1, default: 0 },
  },
};

function parseArgs(argv: string[]): SimOptions {
  const options: Partial<SimOptions> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    switch (key) {
      case 'players':
        options.players = Number(value);
        i++;
        break;
      case 'ticks':
        options.ticks = Number(value);
        i++;
        break;
      case 'sample':
        options.sampleEvery = Number(value);
        i++;
        break;
      case 'policy':
        options.policy = (value as PolicyInput) || 'balanced';
        i++;
        break;
      case 'seasons':
        options.seasons = Number(value);
        i++;
        break;
      case 'out':
        options.out = value;
        i++;
        break;
      case 'db':
        options.dbPath = value;
        i++;
        break;
      case 'help':
        printHelp();
        process.exit(0);
      default:
        break;
    }
  }

  return {
    ...DEFAULT_OPTIONS,
    ...options,
  };
}

function printHelp(): void {
  console.log(`KingdomLedger Simulation Runner

Options:
  --players <n>    Number of simulated cities (default ${DEFAULT_OPTIONS.players})
  --ticks <n>      Number of ticks to advance (default ${DEFAULT_OPTIONS.ticks})
  --sample <n>     Snapshot cadence in ticks (default ${DEFAULT_OPTIONS.sampleEvery})
  --policy <p>     balanced | militarist | trader | diversified (default balanced)
  --seasons <n>    Number of seasons to chain (default ${DEFAULT_OPTIONS.seasons})
  --out <file>     Path to write JSON results (defaults to stdout)
  --db <file>      Path to D1 sqlite file (auto-discovered if omitted)
`);
}

function buildRuntimeConfig(config: SimulationConfig): RuntimeConfig {
  const policies: Policy[] = ['balanced', 'militarist', 'trader'];
  const policyBehavior: Record<Policy, PolicyBehavior> = {
    balanced: { ...DEFAULT_POLICY_BEHAVIOR.balanced },
    militarist: { ...DEFAULT_POLICY_BEHAVIOR.militarist },
    trader: { ...DEFAULT_POLICY_BEHAVIOR.trader },
  };
  for (const policy of policies) {
    const override = (config.policyBehavior?.[policy] ?? {}) as Partial<PolicyBehavior>;
    policyBehavior[policy] = {
      troopFocus: override.troopFocus ?? policyBehavior[policy].troopFocus,
      coinBuffer: override.coinBuffer ?? policyBehavior[policy].coinBuffer,
      rationBuffer: override.rationBuffer ?? policyBehavior[policy].rationBuffer,
      troopBatch: override.troopBatch ?? policyBehavior[policy].troopBatch,
    };
  }

  const buildingBehavior: RuntimeConfig['buildingBehavior'] = {
    default: { order: DEFAULT_BUILDING_ORDER.balanced, desiredLevels: { default: 3 } },
  };
  for (const policy of policies) {
    const override = config.buildingBehavior?.[policy];
    buildingBehavior[policy] = {
      order: override?.constructionOrder?.length ? override.constructionOrder : DEFAULT_BUILDING_ORDER[policy],
      desiredLevels: {
        default: override?.desiredLevels?.default ?? 3,
        ...(override?.desiredLevels || {}),
      },
    };
  }

  const tierTicks: Record<Tier, number> = {
    Settlement: config.tierTicks?.Settlement ?? DEFAULT_TIER_TICKS.Settlement,
    Hamlet: config.tierTicks?.Hamlet ?? DEFAULT_TIER_TICKS.Hamlet,
    Town: config.tierTicks?.Town ?? DEFAULT_TIER_TICKS.Town,
    City: config.tierTicks?.City ?? DEFAULT_TIER_TICKS.City,
  };

  const startingCityRaw = config.startingCity ?? DEFAULT_STARTING_CITY;
  const startingCity: StartingCityConfig = {
    level: startingCityRaw.level ?? DEFAULT_STARTING_CITY.level,
    populationRange: {
      min: startingCityRaw.populationRange?.min ?? DEFAULT_STARTING_CITY.populationRange.min,
      variance: startingCityRaw.populationRange?.variance ?? DEFAULT_STARTING_CITY.populationRange.variance,
    },
    happiness: startingCityRaw.happiness ?? DEFAULT_STARTING_CITY.happiness,
    coins: startingCityRaw.coins ?? DEFAULT_STARTING_CITY.coins,
    resources: { ...DEFAULT_STARTING_CITY.resources, ...(startingCityRaw.resources || {}) },
    buildings: startingCityRaw.buildings || DEFAULT_STARTING_CITY.buildings,
  };

  const buildingOutput =
    Object.keys(config.buildingOutput || {}).length > 0
      ? { ...DEFAULT_BUILDING_OUTPUT, ...config.buildingOutput }
      : { ...DEFAULT_BUILDING_OUTPUT };

  return {
    levelThresholds: config.levelThresholds?.length ? config.levelThresholds : DEFAULT_LEVEL_THRESHOLDS,
    econBaseline: config.econBaseline ?? DEFAULT_ECON_BASELINE,
    tierTicks,
    policyBehavior,
    buildingOutput,
    buildingBehavior,
    startingCity,
    economyTargets: config.economyTargets || {},
  };
}

function resolvePolicy(input: PolicyInput, index: number): Policy {
  if (input !== 'diversified') return input;
  const order: Policy[] = ['balanced', 'militarist', 'trader'];
  return order[index % order.length];
}

function tierFromLevel(level: number): Tier {
  if (level >= 10) return 'City';
  if (level >= 6) return 'Town';
  if (level >= 3) return 'Hamlet';
  return 'Settlement';
}

function createRng(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function resolveStartingBuildings(raw: Record<string, any>, policy: Policy): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw || {})) {
    if (typeof value === 'number') {
      result[code] = value;
    } else if (typeof value === 'object' && value !== null) {
      const specific = value[policy];
      if (typeof specific === 'number') {
        result[code] = specific;
      } else if (typeof value.default === 'number') {
        result[code] = value.default;
      } else {
        result[code] = 0;
      }
    }
  }
  return result;
}

function createInitialCity(id: number, policy: Policy, tuning: RuntimeConfig): SimCityState {
  const rng = createRng(93199 + id * 97);
  const start = tuning.startingCity;
  const baseResources: Record<string, number> = { ...start.resources };
  for (const key of RESOURCE_KEYS) {
    baseResources[key] = baseResources[key] ?? 0;
  }
  const buildings = resolveStartingBuildings(start.buildings, policy);

  return {
    id,
    policy,
    level: start.level,
    tier: 'Settlement',
    population: start.populationRange.min + Math.floor(rng() * start.populationRange.variance),
    coins: start.coins,
    resources: { ...baseResources },
    troops: {},
    happiness: start.happiness,
    ticksInTier: 0,
    buildings,
    tierTimeline: {
      Settlement: 0,
      Hamlet: undefined,
      Town: undefined,
      City: undefined,
    },
    rng,
    season: 1,
    legacyBonuses: {},
  };
}

function totalTroops(city: SimCityState): number {
  return Object.values(city.troops).reduce((sum, qty) => sum + qty, 0);
}

function cloneResources(resources: Record<string, number>): Record<string, number> {
  const copy: Record<string, number> = {};
  for (const key of RESOURCE_KEYS) {
    copy[key] = Math.round((resources[key] || 0) * 100) / 100;
  }
  return copy;
}

function runEconomy(city: SimCityState, tuning: RuntimeConfig) {
  const econFactor = 0.48 + city.level * 0.055 + city.happiness * 0.1;
  for (const [building, output] of Object.entries(tuning.buildingOutput)) {
    const count = city.buildings[building] || 0;
    const bonus = building === 'market' ? city.level : 0;
    for (const [resource, amount] of Object.entries(output)) {
      city.resources[resource] = (city.resources[resource] || 0) + (amount + bonus) * count * econFactor;
    }
  }

  city.resources.FOOD += Math.max(1, city.population * 0.009);
  city.coins += (city.buildings.market || 0) * (1.4 + city.level * 0.35) + city.level * 0.5;

  const kitchens = city.buildings.rations_kitchen || 0;
  if (kitchens > 0 && city.resources.FOOD > kitchens * 10) {
    const rationInput = Math.min(city.resources.FOOD * 0.05, kitchens * (3.2 + city.level * 0.5));
    city.resources.FOOD -= rationInput;
    const rationYield = rationInput * (0.32 + city.happiness * 0.25);
    city.resources.RATIONS += rationYield;
  }

  const troops = totalTroops(city);
  const foodNeed = city.population * 0.018 + troops * 0.035;
  const consumed = Math.min(city.resources.FOOD, foodNeed);
  city.resources.FOOD -= consumed;
  if (consumed < foodNeed * 0.9) {
    city.happiness = Math.max(0.5, city.happiness - 0.012);
  } else {
    city.happiness = Math.min(1, city.happiness + 0.002);
  }

  const civicCost = Math.max(0, city.population * 0.035 + troops * 0.08 - city.buildings.warehouse * 2);
  city.coins = Math.max(0, city.coins - civicCost);
}

function applyUpkeep(city: SimCityState) {
  const troops = totalTroops(city);
  if (troops === 0) return;

  const rationNeed = troops * 0.35;
  const spendable = Math.max(0, city.resources.RATIONS - 20);
  const consumed = Math.min(rationNeed, spendable);
  city.resources.RATIONS -= consumed;
  if (consumed < rationNeed) {
    city.happiness = Math.max(0, city.happiness - 0.012);
  }

  const coinCost = troops * 0.28;
  city.coins = Math.max(0, city.coins - coinCost);
}

function maybeConstruct(city: SimCityState, tick: number, tuning: RuntimeConfig) {
  if (tick % 60 !== 0) return;
  const behavior = tuning.buildingBehavior[city.policy] ?? tuning.buildingBehavior.default;
  const order = behavior?.order?.length ? behavior.order : DEFAULT_BUILDING_ORDER[city.policy];
  for (const building of order) {
    const desiredLevels = behavior?.desiredLevels ?? {};
    const desired = typeof desiredLevels[building] === 'number' ? desiredLevels[building] : (desiredLevels.default ?? 3);
    const current = city.buildings[building] || 0;
    if (current >= desired) continue;

    const costCoins = 150 + current * 40;
    const costWood = 50 + current * 12;
    const costStone = 35 + current * 10;
    if (city.coins > costCoins && city.resources.WOOD > costWood && city.resources.STONE > costStone) {
      city.coins -= costCoins;
      city.resources.WOOD -= costWood;
      city.resources.STONE -= costStone;
      city.buildings[building] = current + 1;
      break;
    }
  }
}

function maybeTrainTroops(city: SimCityState, behavior: PolicyBehavior) {
  const troops = totalTroops(city);
  const econScore =
    city.coins + city.resources.FOOD + city.resources.WOOD + city.resources.STONE + city.resources.RATIONS * 2;
  const rawTarget = Math.floor(econScore * behavior.troopFocus / 500) + behavior.troopBatch * 2;
  const maxTroopsByPop = Math.floor(city.population * 0.6);
  const targetTroops = Math.min(rawTarget, maxTroopsByPop);
  if (troops >= targetTroops) return;
  if (city.coins < behavior.coinBuffer || city.resources.RATIONS < behavior.rationBuffer) return;

  const batch = behavior.troopBatch;
  const rationCost = batch * 2;
  const coinCost = batch * 40;
  if (city.resources.RATIONS < rationCost || city.coins < coinCost) return;

  city.resources.RATIONS -= rationCost;
  city.coins -= coinCost;
  city.troops.MILITIA = (city.troops.MILITIA || 0) + batch;
}

function maybeLevelUp(city: SimCityState, tick: number, tuning: RuntimeConfig) {
  const thresholds = tuning.levelThresholds.length ? tuning.levelThresholds : DEFAULT_LEVEL_THRESHOLDS;
  const goal = thresholds[Math.min(thresholds.length - 1, city.level)];
  city.ticksInTier += 1;
  const econScore = Math.max(
    0,
    city.coins +
      city.resources.FOOD +
      city.resources.WOOD +
      city.resources.STONE +
      city.resources.RATIONS * 2 -
      tuning.econBaseline
  );

  if (econScore < goal) {
    return;
  }

  const requiredTicks = (() => {
    if (city.tier === 'Settlement') return tuning.tierTicks.Settlement ?? DEFAULT_TIER_TICKS.Settlement;
    if (city.tier === 'Hamlet') return tuning.tierTicks.Hamlet ?? DEFAULT_TIER_TICKS.Hamlet;
    if (city.tier === 'Town') return tuning.tierTicks.Town ?? DEFAULT_TIER_TICKS.Town;
    return 0;
  })();

  if (requiredTicks > 0 && city.ticksInTier < requiredTicks) {
    return;
  }

  city.level += 1;
  city.population += 30;
  const newTier = tierFromLevel(city.level);
  if (newTier !== city.tier) {
    city.tier = newTier;
    city.tierTimeline[newTier] = city.tierTimeline[newTier] ?? tick;
    city.ticksInTier = 0;
  }
}

function snapshot(city: SimCityState, tick: number) {
  return {
    tick,
    tier: city.tier,
    resources: cloneResources(city.resources),
    totalUnits: totalTroops(city),
    coins: Math.round(city.coins),
    grain: Math.round(city.resources.FOOD),
    timber: Math.round(city.resources.WOOD),
    stone: Math.round(city.resources.STONE),
    rations: Math.round(city.resources.RATIONS),
  };
}

function summarize(city: SimCityState) {
  return {
    policy: city.policy,
    finalTier: city.tier,
    ticksToTier: {
      Settlement: city.tierTimeline.Settlement ?? 0,
      Hamlet: city.tierTimeline.Hamlet ?? null,
      Town: city.tierTimeline.Town ?? null,
      City: city.tierTimeline.City ?? null,
    },
    totalUnits: totalTroops(city),
    totalBuildings: Object.values(city.buildings).reduce((sum, val) => sum + val, 0),
    surplus: {
      coins: Math.round(city.coins),
      grain: Math.round(city.resources.FOOD),
      timber: Math.round(city.resources.WOOD),
      stone: Math.round(city.resources.STONE),
      rations: Math.round(city.resources.RATIONS),
    },
  };
}

// Phase 3: Season Transitions
function applySeasonReset(city: SimCityState, nextSeason: number): void {
  const legacyCoins = Math.floor(city.coins * 0.01);
  city.level = 1;
  city.tier = 'Settlement';
  city.population = 150;
  city.coins = 1200 + legacyCoins;
  city.resources = { FOOD: 320, WOOD: 200, STONE: 160, RATIONS: 60, FIBER: 100 };
  city.buildings = { farm: 3, lumber_mill: 1, quarry: 1, market: 1, warehouse: 1, rations_kitchen: 1 };
  city.ticksInTier = 0;
  city.tierTimeline = { Settlement: 0, Hamlet: undefined, Town: undefined, City: undefined };
  city.troops = {};
  city.season = nextSeason;
  city.legacyBonuses['season_' + (nextSeason - 1) + '_coins'] = legacyCoins;
}

async function simulateCity(options: {
  id: number;
  policy: Policy;
  ticks: number;
  sampleEvery: number;
  seasons: number;
  tuning: RuntimeConfig;
}): Promise<CityResult> {
  const city = createInitialCity(options.id, options.policy, options.tuning);
  const behavior = options.tuning.policyBehavior[options.policy];
  const timeline: CityResult['timeline'] = [];

  for (let s = 1; s <= options.seasons; s++) {
    if (s > 1) {
      applySeasonReset(city, s);
    }
    const tickOffset = (s - 1) * options.ticks;
    for (let tick = 0; tick < options.ticks; tick++) {
      runEconomy(city, options.tuning);
      maybeConstruct(city, tick, options.tuning);
      maybeTrainTroops(city, behavior);
      applyUpkeep(city);
      maybeLevelUp(city, tick, options.tuning);

      if (tick % options.sampleEvery === 0 || tick === options.ticks - 1) {
        timeline.push({ ...snapshot(city, tick), tick: tickOffset + tick, season: s } as any);
      }
    }
    if (options.players <= 5) {
       process.stdout.write(`Player ${options.id} Season ${s} complete\n`);
    }
  }

  const summary = summarize(city);
  return {
    playerId: `player-${city.id}`,
    summary: {
      policy: summary.policy,
      finalTier: summary.finalTier,
      ticksToTier: summary.ticksToTier,
      totalUnits: summary.totalUnits,
      totalBuildings: summary.totalBuildings,
      surplus: summary.surplus,
    },
    timeline,
  };
}

async function runSimulation(options: SimOptions, tuning: RuntimeConfig): Promise<CityResult[]> {
  const results: CityResult[] = [];
  for (let i = 0; i < options.players; i++) {
    const policy = resolvePolicy(options.policy, i);
    const result = await simulateCity({
      id: i,
      policy,
      ticks: options.ticks,
      sampleEvery: options.sampleEvery,
      seasons: options.seasons,
      tuning,
    });
    results.push(result);
    process.stdout.write(`Simulated player ${i + 1}/${options.players} (${policy})\n`);
  }
  return results;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  let db: ReturnType<typeof openDatabase> | null = null;
  try {
    db = openDatabase(options.dbPath);
  } catch (error) {
    console.error('[simulate] unable to open D1 database', error);
    process.exit(1);
  }

  const runtimeConfig = buildRuntimeConfig(loadSimulationConfig(db));
  const runId = randomUUID();
  const results = await runSimulation(options, runtimeConfig);

  const cliPath =
    typeof __filename !== 'undefined'
      ? path.relative(process.cwd(), __filename)
      : 'cli/tools/simulate.ts';

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      players: options.players,
      ticks: options.ticks,
      sampleEvery: options.sampleEvery,
      policy: options.policy,
      seasons: options.seasons,
      cli: cliPath,
      runId,
      db: db?.name,
    },
    results,
  };

  if (db) {
    try {
      insertSimRun(db, {
        runId,
        scenario: { options, config: runtimeConfig },
        results: {
          summaries: results.map((r) => r.summary),
          players: options.players,
          ticks: options.ticks,
          seasons: options.seasons,
        },
      });
    } catch (err) {
      console.warn('[simulate] failed to log simulation run', err);
    } finally {
      db.close();
    }
  }

  if (options.out) {
    const outPath = path.isAbsolute(options.out) ? options.out : path.join(process.cwd(), options.out);
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`Simulation complete. Wrote ${outPath}`);
  } else {
    console.log(JSON.stringify(output, null, 2));
  }
}

main().catch((error) => {
  console.error('[simulate] failed', error);
  process.exit(1);
});
