-- Council social, tech, and communication layers

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS council_tech_tree (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  tier INTEGER DEFAULT 1,
  cost_json TEXT NOT NULL,
  prerequisites_json TEXT DEFAULT '[]',
  buff_json TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS council_tech_progress (
  id TEXT PRIMARY KEY,
  council_id TEXT NOT NULL,
  tech_id TEXT NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'locked' CHECK(status IN ('locked','active','completed')),
  contributed_resources_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (council_id) REFERENCES councils(id) ON DELETE CASCADE,
  FOREIGN KEY (tech_id) REFERENCES council_tech_tree(id) ON DELETE CASCADE,
  UNIQUE (council_id, tech_id)
);

CREATE TABLE IF NOT EXISTS council_member_contributions (
  id TEXT PRIMARY KEY,
  council_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  contribution_type TEXT NOT NULL CHECK(contribution_type IN ('tech','project','treasury')),
  target_id TEXT,
  resource_code TEXT,
  amount REAL NOT NULL DEFAULT 0,
  metadata_json TEXT,
  contributed_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (council_id) REFERENCES councils(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS council_project_defs (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  required_resources_json TEXT NOT NULL,
  buff_json TEXT NOT NULL,
  unlocks_json TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS council_projects (
  id TEXT PRIMARY KEY,
  council_id TEXT NOT NULL,
  project_def_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','cancelled')),
  progress REAL NOT NULL DEFAULT 0,
  contributed_resources_json TEXT NOT NULL DEFAULT '{}',
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (council_id) REFERENCES councils(id) ON DELETE CASCADE,
  FOREIGN KEY (project_def_id) REFERENCES council_project_defs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS council_chat_log (
  id TEXT PRIMARY KEY,
  council_id TEXT NOT NULL,
  user_id TEXT,
  username TEXT,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (council_id) REFERENCES councils(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS council_prestige (
  council_id TEXT PRIMARY KEY,
  season TEXT NOT NULL,
  prestige_score REAL NOT NULL DEFAULT 0,
  rank INTEGER,
  buffs_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (council_id) REFERENCES councils(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_council_progress_council ON council_tech_progress(council_id);
CREATE INDEX IF NOT EXISTS idx_council_progress_status ON council_tech_progress(status);
CREATE INDEX IF NOT EXISTS idx_council_contrib_council ON council_member_contributions(council_id);
CREATE INDEX IF NOT EXISTS idx_council_contrib_user ON council_member_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_council_projects_council ON council_projects(council_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_council_projects_active ON council_projects(council_id, project_def_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_council_chat_council ON council_chat_log(council_id);

-- Starter council tech definitions for shared tree
INSERT OR IGNORE INTO council_tech_tree (id, code, name, description, tier, cost_json, prerequisites_json, buff_json)
VALUES
  ('tech-shared-ledgers', 'SHARED_LEDGERS', 'Shared Ledgers', 'Unlock trade tax sharing and +3% coin generation', 1, '{"COINS":2500,"WOOD":500}', '[]', '{"production":{"COINS":0.03}}'),
  ('tech-war-council', 'WAR_COUNCIL', 'War Council', 'Unlock militia cap increase and +5% troop strength', 2, '{"COINS":4000,"RATIONS":350}', '["SHARED_LEDGERS"]', '{"combat":{"power":0.05}}'),
  ('tech-grand-market', 'GRAND_MARKET', 'Grand Market', 'Unlock council market buffs and +8% trade speed', 3, '{"COINS":6000,"STONE":800}', '["SHARED_LEDGERS"]', '{"trade":{"speed":0.08}}');

INSERT OR IGNORE INTO council_project_defs (id, code, name, description, required_resources_json, buff_json)
VALUES
  ('proj-great-library', 'GREAT_LIBRARY', 'Great Library', 'Council-wide research speed bonus', '{"WOOD":1200,"STONE":1000,"COINS":5000}', '{"tech":{"speed":0.1}}'),
  ('proj-war-garrison', 'WAR_GARRISON', 'War Garrison', 'Unlocks mercenary contracts and +10% militia cap', '{"STONE":1500,"RATIONS":600,"COINS":7000}', '{"combat":{"militiaCap":0.1}}');


