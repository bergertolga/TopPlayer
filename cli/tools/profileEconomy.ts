#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';
import { openDatabase, loadSimulationConfig, updateSimRunAdjustments, SimulationConfig } from '../db';

interface SimulationFile {
  meta: Record<string, any>;
  results: Array<{
    playerId: string;
    summary: {
      policy: string;
      finalTier: string;
      ticksToTier: Record<string, number | null>;
      totalUnits: number;
      totalBuildings: number;
      surplus: Record<string, number>;
    };
    timeline: Array<{
      tick: number;
      tier: string;
      coins: number;
      grain: number;
      timber: number;
      stone: number;
      rations: number;
    }>;
  }>;
}

interface ProfileOptions {
  input: string;
  out?: string;
  verbose: boolean;
  dbPath?: string;
}

const DEFAULT_PROFILE_OPTIONS: ProfileOptions = {
  input: 'sim.json',
  verbose: true,
};

const STARTING_RESOURCES = {
  coins: 1000,
  grain: 300,
  timber: 100,
  stone: 60,
  rations: 0,
};

const PACING_TARGETS: Record<string, { min: number; max: number; ideal: number }> = {
  Hamlet: { min: 50, max: 120, ideal: 85 },
  Town: { min: 400, max: 900, ideal: 650 },
  City: { min: 1600, max: 1800, ideal: 1700 },
};

const DEFAULT_ECONOMY_TARGETS = {
  lateGameCoinTarget: 120000,
  militarizationTarget: 0.35,
  purchasePressureTarget: 0.3,
};

function parseArgs(argv: string[]): ProfileOptions {
  const options: Partial<ProfileOptions> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    switch (key) {
      case 'in':
        options.input = argv[i + 1];
        i++;
        break;
      case 'out':
        options.out = argv[i + 1];
        i++;
        break;
      case 'db':
        options.dbPath = argv[i + 1];
        i++;
        break;
      case 'quiet':
        options.verbose = false;
        break;
      case 'help':
        printHelp();
        process.exit(0);
      default:
        break;
    }
  }

  return {
    ...DEFAULT_PROFILE_OPTIONS,
    ...options,
  };
}

function printHelp(): void {
  console.log(`KingdomLedger Economy Profiler

Options:
  --in <file>     Simulation output to read (default sim.json)
  --out <file>    Metrics JSON to write (optional)
  --quiet         Suppress console tables
  --db <file>     Path to D1 sqlite file for logging adjustments
  --help          Show usage

Example:
  ./cli/profileEconomy.sh --in sim.json --out metrics.json
`);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function happinessProxy(entry: { grain: number; rations: number; totalUnits?: number }): number {
  const populationLoad = 100 + (entry.totalUnits ?? 0) * 5;
  const foodFactor = Math.min(1, entry.grain / populationLoad);
  const rationsFactor = Math.min(1, (entry.rations ?? 0) / Math.max(1, entry.totalUnits ?? 1));
  return Math.max(0, Math.min(1, (foodFactor * 0.7) + (rationsFactor * 0.3)));
}

function buildMetrics(sim: SimulationFile) {
  const totalSimTicks = typeof sim.meta?.ticks === 'number' ? Number(sim.meta.ticks) : 2000;
  const tierMedians: Record<string, number | null> = {};
  for (const tier of ['Hamlet', 'Town', 'City']) {
    const samples = sim.results
      .map((r) => r.summary.ticksToTier[tier])
      .filter((value): value is number => typeof value === 'number');
    tierMedians[tier] = median(samples);
  }

  const driftTotals: Record<string, number> = {
    coins: 0,
    grain: 0,
    timber: 0,
    stone: 0,
    rations: 0,
  };
  for (const result of sim.results) {
    for (const key of Object.keys(driftTotals)) {
      const finalValue = result.summary.surplus[key] ?? 0;
      driftTotals[key] += finalValue - (STARTING_RESOURCES as any)[key];
    }
  }

  const militarized = sim.results.filter((r) => {
    const totalProd = Math.max(1, r.summary.totalBuildings * 5);
    return r.summary.totalUnits / totalProd >= 0.3;
  }).length;
  const militarizationRate = sim.results.length === 0 ? 0 : militarized / sim.results.length;

  const happinessSamples: number[] = [];
  sim.results.forEach((r) => {
    r.timeline.forEach((entry) => {
      happinessSamples.push(
        happinessProxy({
          grain: entry.grain,
          rations: entry.rations,
          totalUnits: r.summary.totalUnits,
        })
      );
    });
  });

  const stagnationWindows: number[] = sim.results.map((r) => {
    const townTick = r.summary.ticksToTier['Town'];
    const cityTick = r.summary.ticksToTier['City'];
    if (typeof townTick !== 'number') return 0;
    if (typeof cityTick === 'number') return 0;
    return Math.max(0, totalSimTicks - townTick);
  });

  const slowCount = sim.results.filter((r) => {
    const townTick = r.summary.ticksToTier['Town'];
    const cityTick = r.summary.ticksToTier['City'];
    const slowTown = typeof townTick === 'number' && townTick > 1200;
    const slowCity = typeof cityTick === 'number' && cityTick > 1800;
    const stuckAfterTown =
      (cityTick === null || cityTick === undefined) && typeof townTick === 'number' && totalSimTicks - townTick > 200;
    return slowTown || slowCity || stuckAfterTown;
  }).length;

  return {
    medianTicks: tierMedians,
    netResourceDrift: driftTotals,
    militarizationRate: Number(militarizationRate.toFixed(3)),
    happinessStdDev: Number(stdDev(happinessSamples).toFixed(3)),
    stagnationTicksMedian: median(stagnationWindows),
    purchasePressure: {
      slowProgressPercent:
        sim.results.length === 0 ? 0 : Number(((slowCount / sim.results.length) * 100).toFixed(1)),
      thresholds: { town: 1200, city: 1800 },
    },
  };
}

function buildAdjustmentSuggestions(
  metrics: ReturnType<typeof buildMetrics>,
  config: SimulationConfig | null,
  cohortSize: number
) {
  const economyTargets = { ...DEFAULT_ECONOMY_TARGETS, ...(config?.economyTargets || {}) };
  const tierTicks = config?.tierTicks || {};

  function pacingEntry(tier: 'Hamlet' | 'Town' | 'City') {
    const medianTick = metrics.medianTicks[tier];
    if (typeof medianTick !== 'number') {
      return { median: null, target: PACING_TARGETS[tier].ideal, delta: null, recommended: tierTicks[tier] ?? PACING_TARGETS[tier].ideal };
    }
    const delta = Number((medianTick - PACING_TARGETS[tier].ideal).toFixed(1));
    const recommended =
      (tierTicks[tier] ?? PACING_TARGETS[tier].ideal) - Math.round(delta * 0.25);
    return {
      median: medianTick,
      target: PACING_TARGETS[tier].ideal,
      delta,
      recommended,
    };
  }

  const avgCoinDrift = cohortSize > 0 ? metrics.netResourceDrift.coins / cohortSize : metrics.netResourceDrift.coins;
  const econBaselineAdjustment = Number((-avgCoinDrift / 500).toFixed(2));

  const militarizationGap = Number(
    (economyTargets.militarizationTarget - metrics.militarizationRate).toFixed(3)
  );
  const purchaseRate = metrics.purchasePressure.slowProgressPercent / 100;
  const purchaseGap = Number(
    (economyTargets.purchasePressureTarget - purchaseRate).toFixed(3)
  );

  return {
    pacing: {
      Hamlet: pacingEntry('Hamlet'),
      Town: pacingEntry('Town'),
      City: pacingEntry('City'),
    },
    economy: {
      avgCoinDrift: Number(avgCoinDrift.toFixed(1)),
      recommendedEconBaselineShift: econBaselineAdjustment,
      lateGameCoinTarget: economyTargets.lateGameCoinTarget,
    },
    militarization: {
      current: metrics.militarizationRate,
      target: economyTargets.militarizationTarget,
      focusAdjustment: militarizationGap,
    },
    purchasePressure: {
      current: purchaseRate,
      target: economyTargets.purchasePressureTarget,
      pressureAdjustment: purchaseGap,
    },
  };
}

function prettyPrint(
  metrics: ReturnType<typeof buildMetrics>,
  adjustments: ReturnType<typeof buildAdjustmentSuggestions> | null,
  verbose: boolean
): void {
  if (!verbose) return;
  console.log('\n=== Progression Pace (ticks) ===');
  console.table({
    Hamlet: metrics.medianTicks.Hamlet ?? '-',
    Town: metrics.medianTicks.Town ?? '-',
    City: metrics.medianTicks.City ?? '-',
  });

  console.log('\n=== Net Resource Drift (per cohort) ===');
  console.table([metrics.netResourceDrift]);

  console.log('\n=== Key Rates ===');
  console.table([
    {
      Militarization: `${(metrics.militarizationRate * 100).toFixed(1)}%`,
      HappinessStdDev: metrics.happinessStdDev,
      StagnationMedianTicks: metrics.stagnationTicksMedian ?? '-',
      PurchasePressure: `${metrics.purchasePressure.slowProgressPercent}% (T>${metrics.purchasePressure.thresholds.town} | C>${metrics.purchasePressure.thresholds.city})`,
    },
  ]);

  if (adjustments) {
    console.log('\n=== Suggested Adjustments ===');
    console.table([
      {
        HamletDelta: adjustments.pacing.Hamlet.delta,
        TownDelta: adjustments.pacing.Town.delta,
        CityDelta: adjustments.pacing.City.delta,
        EconShift: adjustments.economy.recommendedEconBaselineShift,
        MilFocusAdj: adjustments.militarization.focusAdjustment,
        PurchaseAdj: adjustments.purchasePressure.pressureAdjustment,
      },
    ]);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.isAbsolute(options.input)
    ? options.input
    : path.join(process.cwd(), options.input);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as SimulationFile;
  const metrics = buildMetrics(data);

  let db: ReturnType<typeof openDatabase> | null = null;
  let simConfig: SimulationConfig | null = null;
  const runId = data.meta?.runId;
  try {
    db = openDatabase(options.dbPath);
    simConfig = loadSimulationConfig(db);
  } catch (err) {
    if (options.dbPath) {
      console.warn(`[profileEconomy] unable to open DB at ${options.dbPath}`, err);
    }
    db = null;
  }

  const adjustments = buildAdjustmentSuggestions(metrics, simConfig, data.results.length);

  if (db && runId) {
    try {
      updateSimRunAdjustments(db, runId, adjustments);
    } catch (err) {
      console.warn('[profileEconomy] failed to update sim_run_metrics', err);
    }
  }

  prettyPrint(metrics, adjustments, options.verbose);

  const payload = {
    meta: data.meta,
    metrics,
    adjustments,
    generatedAt: new Date().toISOString(),
  };

  if (options.out) {
    const outPath = path.isAbsolute(options.out) ? options.out : path.join(process.cwd(), options.out);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
    if (options.verbose) {
      console.log(`\nMetrics written to ${outPath}`);
    }
  } else if (!options.verbose) {
    console.log(JSON.stringify(payload, null, 2));
  }

  if (db) {
    db.close();
  }
}

main().catch((error) => {
  console.error('[profileEconomy] failed', error);
  process.exit(1);
});

