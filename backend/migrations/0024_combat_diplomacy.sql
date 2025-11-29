-- Combat, Diplomacy, and PvE
-- 0024_combat_diplomacy.sql

-- Extended stats for units (attack, defense, health, load_capacity, speed)
ALTER TABLE troop_types ADD COLUMN stats_json TEXT DEFAULT '{}';

-- Battle Logs: Record of all combat interactions
CREATE TABLE IF NOT EXISTS battle_logs (
  id TEXT PRIMARY KEY,
  attacker_id TEXT NOT NULL, -- User ID or 'NPC'
  defender_id TEXT NOT NULL, -- User ID or 'NPC'
  winner_id TEXT, -- User ID or 'NPC' or NULL (draw)
  battle_type TEXT NOT NULL CHECK(battle_type IN ('PVE', 'PVP', 'COUNCIL_WAR')),
  location_type TEXT NOT NULL DEFAULT 'city', -- city, map_entity
  location_id TEXT, -- city_id or map_entity_id
  started_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  ended_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  
  -- JSON details:
  -- {
  --   attacker_units: { type_id: { start: 100, loss: 10 } },
  --   defender_units: { ... },
  --   loot: { COINS: 500, FOOD: 1000 },
  --   rounds: [ ...log... ]
  -- }
  details_json TEXT NOT NULL DEFAULT '{}'
);

-- Map Entities: PvE Targets (Bandit Camps, Mines, Ruins)
CREATE TABLE IF NOT EXISTS map_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('BANDIT_CAMP', 'RESOURCE_NODE', 'ANCIENT_RUIN')),
  level INTEGER NOT NULL DEFAULT 1,
  
  -- Pseudo-location (region/tile system can be added later)
  region_id TEXT, 
  
  -- Contents
  defenders_json TEXT NOT NULL DEFAULT '{}', -- { troop_code: count }
  rewards_json TEXT NOT NULL DEFAULT '{}', -- { resources: {}, items: [] }
  
  -- Lifecycle
  spawned_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  expires_at INTEGER,
  defeated_at INTEGER,
  defeated_by_user_id TEXT,
  
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'defeated', 'expired'))
);

-- Council Diplomacy: Relationships between councils
CREATE TABLE IF NOT EXISTS council_diplomacy (
  id TEXT PRIMARY KEY,
  council_a_id TEXT NOT NULL,
  council_b_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('NEUTRAL', 'ALLY', 'WAR', 'NAP')),
  
  -- Metadata (e.g., war score, start time of war)
  metadata_json TEXT DEFAULT '{}',
  
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  
  FOREIGN KEY (council_a_id) REFERENCES councils(id) ON DELETE CASCADE,
  FOREIGN KEY (council_b_id) REFERENCES councils(id) ON DELETE CASCADE,
  
  -- Ensure A < B for unique pairs logic, or handle via query
  UNIQUE(council_a_id, council_b_id)
);

-- Council Tech Contributions: Tracking who gave what to which tech
-- (Already partially covered by council_member_contributions, but we need granular tech buffs cache)

-- Add index for map entities
CREATE INDEX IF NOT EXISTS idx_map_entities_status ON map_entities(status);
CREATE INDEX IF NOT EXISTS idx_battle_logs_attacker ON battle_logs(attacker_id);
CREATE INDEX IF NOT EXISTS idx_battle_logs_defender ON battle_logs(defender_id);


