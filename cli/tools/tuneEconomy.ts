
import fs from 'node:fs';
import path from 'node:path';
import { openDatabase, loadSimulationConfig } from '../db';

interface MetricsOutput {
  adjustments: {
    pacing: Record<string, { delta: number; recommended: number }>;
    economy: { recommendedEconBaselineShift: number };
    militarization: { focusAdjustment: number };
    purchasePressure: { pressureAdjustment: number };
  };
}

function main() {
  const metricsPath = process.argv[2];
  if (!metricsPath) {
    console.error('Usage: tsx tools/tuneEconomy.ts <metrics.json>');
    process.exit(1);
  }

  const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8')) as MetricsOutput;
  const { adjustments } = metrics;

  console.log('-- Suggested Economy Tuning SQL --\n');

  // 1. Tier Pacing
  if (adjustments.pacing) {
    console.log('-- Adjust Tier Pacing Targets');
    const tiers = adjustments.pacing;
    // We can't easily patch the deeply nested JSON in SQL without replacing the whole object
    // or using json_patch (if available). For now, we'll generate a comment
    // advising the user to update the "tierTicks" in 'cfg-tier-default'.
    console.log(`/* 
    UPDATE sim_config_values 
    SET value_json = json_patch(value_json, '{"tierTicks": {
      "Hamlet": ${tiers.Hamlet.recommended}, 
      "Town": ${tiers.Town.recommended}, 
      "City": ${tiers.City?.recommended ?? 0}
    }}')
    WHERE key = 'default' AND group_id = (SELECT id FROM sim_config_groups WHERE code = 'tier_pacing');
    */`);
    
    // Also likely need to bump level thresholds if we are moving too fast
    console.log(`-- NOTE: If pacing is too fast (negative delta), consider raising levelThresholds in 'cfg-tier-default' as well.`);
  }

  // 2. Economy Baseline
  if (adjustments.economy?.recommendedEconBaselineShift) {
    console.log('\n-- Adjust Econ Baseline');
    console.log(`/*
    UPDATE sim_config_values
    SET value_json = json_set(value_json, '$.econBaseline', json_extract(value_json, '$.econBaseline') + (${adjustments.economy.recommendedEconBaselineShift}))
    WHERE key = 'default' AND group_id = (SELECT id FROM sim_config_groups WHERE code = 'tier_pacing');
    */`);
  }

  // 3. Militarization
  if (adjustments.militarization?.focusAdjustment) {
    console.log('\n-- Adjust Militarization (Troop Focus)');
    // Reduce troopFocus for all policies if rate is too high
    const adj = adjustments.militarization.focusAdjustment;
    // If adj is negative (e.g. -0.65), we need to reduce focus. 
    // We'll apply a scaling factor.
    console.log(`/*
    -- High militarization (${adj}) -> Lower troopFocus
    UPDATE sim_config_values
    SET value_json = json_set(value_json, '$.troopFocus', MAX(0.1, json_extract(value_json, '$.troopFocus') + (${adj} * 0.5)))
    WHERE group_id = (SELECT id FROM sim_config_groups WHERE code = 'policy_profiles');
    */`);
  }

  // 4. Purchase Pressure
  if (adjustments.purchasePressure?.pressureAdjustment) {
     console.log('\n-- Adjust Purchase Pressure');
     console.log(`-- Pressure gap: ${adjustments.purchasePressure.pressureAdjustment}`);
     console.log(`-- Consider reducing "coinBuffer" or increasing construction costs if pressure is too low.`);
  }
}

main();

