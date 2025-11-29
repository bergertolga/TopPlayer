-- Events and Leaderboards
-- Tracks time-limited competitions and rankings

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS event_definitions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('council_contribution', 'personal_production', 'combat_raid')),
  name TEXT NOT NULL,
  description TEXT,
  scoring_config_json TEXT NOT NULL, -- { metric: 'contributions', resource: 'COINS' }
  rewards_json TEXT NOT NULL, -- { rank_1: { crowns: 100 }, top_10_percent: { favor: 50 } }
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS event_instances (
  id TEXT PRIMARY KEY,
  definition_id TEXT NOT NULL,
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'active', 'calculating', 'completed')),
  metadata_json TEXT, -- e.g. { season_name: "Winter War" }
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (definition_id) REFERENCES event_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_participation (
  id TEXT PRIMARY KEY,
  instance_id TEXT NOT NULL,
  participant_id TEXT NOT NULL, -- user_id or council_id depending on event type
  participant_type TEXT NOT NULL CHECK(participant_type IN ('user', 'council')),
  score REAL NOT NULL DEFAULT 0,
  rank INTEGER,
  rewards_claimed_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (instance_id) REFERENCES event_instances(id) ON DELETE CASCADE,
  UNIQUE (instance_id, participant_id)
);

-- Leaderboard Snapshots (for historical browsing)
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL, -- 'city_wealth', 'council_tech'
  period_key TEXT NOT NULL, -- '2025-W48', 'season_1'
  rankings_json TEXT NOT NULL, -- Top 100 list
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_event_instances_status ON event_instances(status, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_event_participation_score ON event_participation(instance_id, score DESC);

-- Seed some initial event definitions
INSERT OR IGNORE INTO event_definitions (id, code, type, name, description, scoring_config_json, rewards_json)
VALUES
  ('evt-royal-tribute', 'ROYAL_TRIBUTE', 'personal_production', 'Royal Tribute', 'Produce the most coins for the King', '{"metric":"delta_resource","resource":"COINS"}', '{"rank_1":{"crowns":500},"top_10_percent":{"favor":100}}'),
  ('evt-council-war', 'COUNCIL_WAR', 'council_contribution', 'Council War', 'Contribute rations to the war effort', '{"metric":"contribution_total","resource":"RATIONS"}', '{"rank_1":{"buff":{"code":"WAR_VICTORY","duration":24}}}');

