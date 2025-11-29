-- Live configuration tables powering simulation + CLI tuning

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sim_config_groups (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS sim_config_values (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (group_id) REFERENCES sim_config_groups(id) ON DELETE CASCADE,
  UNIQUE (group_id, key)
);

CREATE INDEX IF NOT EXISTS idx_sim_config_values_group ON sim_config_values(group_id);

CREATE TABLE IF NOT EXISTS sim_run_metrics (
  id TEXT PRIMARY KEY,
  run_at INTEGER NOT NULL,
  scenario_json TEXT NOT NULL,
  results_json TEXT NOT NULL,
  adjustments_json TEXT,
  notes TEXT
);

-- Helper views so Workers/CLI can query config without extra JSON parsing
DROP VIEW IF EXISTS policy_profiles;
CREATE VIEW policy_profiles AS
SELECT
  v.key AS policy,
  json_extract(v.value_json, '$.troopFocus') AS troop_focus,
  json_extract(v.value_json, '$.coinBuffer') AS coin_buffer,
  json_extract(v.value_json, '$.rationBuffer') AS ration_buffer,
  json_extract(v.value_json, '$.troopBatch') AS troop_batch
FROM sim_config_values v
JOIN sim_config_groups g ON g.id = v.group_id
WHERE g.code = 'policy_profiles';

DROP VIEW IF EXISTS tier_pacing;
CREATE VIEW tier_pacing AS
SELECT
  json_extract(v.value_json, '$.levelThresholds') AS level_thresholds,
  json_extract(v.value_json, '$.econBaseline') AS econ_baseline,
  json_extract(v.value_json, '$.tierTicks.Settlement') AS settlement_ticks,
  json_extract(v.value_json, '$.tierTicks.Hamlet') AS hamlet_ticks,
  json_extract(v.value_json, '$.tierTicks.Town') AS town_ticks
FROM sim_config_values v
JOIN sim_config_groups g ON g.id = v.group_id
WHERE g.code = 'tier_pacing'
LIMIT 1;

DROP VIEW IF EXISTS building_behavior_overrides;
CREATE VIEW building_behavior_overrides AS
SELECT
  v.key AS policy,
  json_extract(v.value_json, '$.constructionOrder') AS construction_order,
  json_extract(v.value_json, '$.desiredLevels') AS desired_levels
FROM sim_config_values v
JOIN sim_config_groups g ON g.id = v.group_id
WHERE g.code = 'building_behavior_overrides';

-- Baseline config mirroring the previous hardcoded constants
INSERT OR IGNORE INTO sim_config_groups (id, code, description)
VALUES
  ('cfg-tier', 'tier_pacing', 'Level thresholds and tier pacing targets'),
  ('cfg-policy', 'policy_profiles', 'Behavior per policy archetype'),
  ('cfg-build-order', 'building_behavior_overrides', 'Construction order and desired levels'),
  ('cfg-building-output', 'building_output', 'Per-building resource yield'),
  ('cfg-city-start', 'city_start', 'Initial city state for new simulations'),
  ('cfg-balance', 'balance_rules', 'City production & happiness tuning');

INSERT OR REPLACE INTO sim_config_values (id, group_id, key, value_json)
VALUES
  (
    'cfg-tier-default',
    'cfg-tier',
    'default',
    json_object(
      'levelThresholds', json('[0, 220, 650, 2100, 5200, 9000, 14000, 20000, 27000, 34000]'),
      'econBaseline', 360,
      'tierTicks', json_object(
        'Settlement', 55,
        'Hamlet', 160,
        'Town', 240
      )
    )
  ),
  ('cfg-policy-balanced', 'cfg-policy', 'balanced', json_object('troopFocus', 0.27, 'coinBuffer', 180, 'rationBuffer', 28, 'troopBatch', 4)),
  ('cfg-policy-militarist', 'cfg-policy', 'militarist', json_object('troopFocus', 0.58, 'coinBuffer', 140, 'rationBuffer', 22, 'troopBatch', 6)),
  ('cfg-policy-trader', 'cfg-policy', 'trader', json_object('troopFocus', 0.1, 'coinBuffer', 280, 'rationBuffer', 20, 'troopBatch', 2)),
  (
    'cfg-build-order-balanced',
    'cfg-build-order',
    'balanced',
    json_object(
      'constructionOrder', json('["rations_kitchen","farm","lumber_mill","quarry","barracks","market","warehouse"]'),
      'desiredLevels', json_object('barracks', 2, 'market', 2, 'default', 3)
    )
  ),
  (
    'cfg-build-order-militarist',
    'cfg-build-order',
    'militarist',
    json_object(
      'constructionOrder', json('["rations_kitchen","barracks","farm","lumber_mill","quarry","market"]'),
      'desiredLevels', json_object('barracks', 4, 'default', 3)
    )
  ),
  (
    'cfg-build-order-trader',
    'cfg-build-order',
    'trader',
    json_object(
      'constructionOrder', json('["market","warehouse","farm","lumber_mill","quarry","rations_kitchen"]'),
      'desiredLevels', json_object('market', 4, 'warehouse', 4, 'rations_kitchen', 1, 'default', 3)
    )
  ),
  (
    'cfg-building-output-default',
    'cfg-building-output',
    'default',
    json_object(
      'farm', json_object('FOOD', 3),
      'lumber_mill', json_object('WOOD', 2),
      'quarry', json_object('STONE', 2),
      'market', json_object(),
      'warehouse', json_object(),
      'barracks', json_object(),
      'rations_kitchen', json_object()
    )
  ),
  (
    'cfg-city-start-default',
    'cfg-city-start',
    'default',
    json_object(
      'level', 1,
      'populationRange', json_object('min', 150, 'variance', 80),
      'happiness', 0.92,
      'coins', 1200,
      'resources', json_object(
        'FOOD', 320,
        'WOOD', 200,
        'STONE', 160,
        'RATIONS', 60,
        'FIBER', 100
      ),
      'buildings', json_object(
        'farm', json_object('balanced', 3, 'militarist', 2, 'trader', 3),
        'lumber_mill', 1,
        'quarry', 1,
        'market', json_object('trader', 2, 'default', 1),
        'warehouse', json_object('trader', 2, 'default', 1),
        'rations_kitchen', json_object('trader', 0, 'default', 1),
        'barracks', json_object('militarist', 1, 'default', 0)
      )
    )
  ),
  (
    'cfg-balance-default',
    'cfg-balance',
    'default',
    json_object(
      'production', json_object('baseMultiplierPerLevel', 0.15),
      'refining', json_object('baseEfficiency', 0.9, 'efficiencyPerLevel', 0.02),
      'happiness', json_object('foodDeficitPenalty', -0.1, 'fabricDeficitPenalty', -0.05, 'festivalBonus', 0.02, 'min', 0.0, 'max', 1.0),
      'warehouse', json_object('baseCapacity', 5000, 'capacityMultiplier', 1.5)
    )
  );

-- convenience seed rows for additional behavior groups (can be overwritten later)
INSERT OR IGNORE INTO sim_config_groups (id, code, description)
VALUES ('cfg-economy', 'economy_flags', 'Misc economy toggles for sim');

INSERT OR IGNORE INTO sim_config_values (id, group_id, key, value_json)
VALUES ('cfg-economy-default', 'cfg-economy', 'default', json_object('lateGameCoinTarget', 120000, 'militarizationTarget', 0.35));


