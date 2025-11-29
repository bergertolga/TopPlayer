-- Seasonal Flow and Legacy Mechanics
-- Introduces eras, crises, momentum, and legacy buffs

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS season_definitions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 90,
  rules_json TEXT NOT NULL DEFAULT '{}', -- { productionMultiplier: 1.0, crisisThresholds: { FOOD: 100 } }
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS season_instances (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'ended', 'archived')),
  metadata_json TEXT, -- e.g. { winningCouncilId: '...' }
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (definition_id) REFERENCES season_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS legacy_bonuses (
  user_id TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  bonus_type TEXT NOT NULL, -- 'production', 'start_resources', 'crown_discount'
  value REAL NOT NULL,
  source TEXT NOT NULL, -- 'rank_1_council', 'top_10_wealth'
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  PRIMARY KEY (user_id, season_number, bonus_type),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_season_stats (
  user_id TEXT NOT NULL,
  season_id TEXT NOT NULL,
  peak_population INTEGER DEFAULT 0,
  peak_wealth REAL DEFAULT 0,
  total_contributions REAL DEFAULT 0,
  final_rank INTEGER,
  legacy_points_earned INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  PRIMARY KEY (user_id, season_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (season_id) REFERENCES season_instances(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS council_momentum (
  council_id TEXT PRIMARY KEY,
  score REAL NOT NULL DEFAULT 0,
  decay_rate REAL NOT NULL DEFAULT 0.05, -- 5% per tick/hour
  last_updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (council_id) REFERENCES councils(id) ON DELETE CASCADE
);

ALTER TABLE event_instances ADD COLUMN season_id TEXT REFERENCES season_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_season_instances_status ON season_instances(status);
CREATE INDEX IF NOT EXISTS idx_user_season_stats_season ON user_season_stats(season_id, final_rank);

-- Seed initial seasons
INSERT OR IGNORE INTO season_definitions (id, code, name, description, duration_days, rules_json)
VALUES
  ('season-expansion', 'AGE_OF_EXPANSION', 'Age of Expansion', 'A time of peace and rapid growth.', 30, '{"productionMultiplier": 1.2, "happinessDecay": 0.0, "crisisThresholds": {"FOOD": 50}}'),
  ('season-conflict', 'AGE_OF_CONFLICT', 'Age of Conflict', 'War ravages the land. Troops cost less but eat more.', 30, '{"productionMultiplier": 1.0, "troopUpkeep": 1.5, "trainCost": 0.8, "crisisThresholds": {"RATIONS": 200}}'),
  ('season-scarcity', 'AGE_OF_SCARCITY', 'Age of Scarcity', 'Resources are scarce. Hoarding is penalized.', 30, '{"productionMultiplier": 0.8, "happinessDecay": 0.02, "spoilage": 0.05, "crisisThresholds": {"FOOD": 500}}');

-- Start Season 1 (Expansion)
INSERT OR IGNORE INTO season_instances (id, definition_id, season_number, start_at, end_at, status)
SELECT 
  'season-1', 
  id, 
  1, 
  (strftime('%s','now') * 1000), 
  (strftime('%s','now') * 1000) + (30 * 24 * 60 * 60 * 1000), 
  'active'
FROM season_definitions 
WHERE code = 'AGE_OF_EXPANSION'
AND NOT EXISTS (SELECT 1 FROM season_instances WHERE season_number = 1);

