-- World events and NPC questlines

CREATE TABLE IF NOT EXISTS world_events (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS world_event_participants (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  reward_claimed INTEGER NOT NULL DEFAULT 0,
  last_update INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES world_events(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS npc_quests (
  id TEXT PRIMARY KEY,
  npc_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirements_json TEXT NOT NULL,
  rewards_json TEXT NOT NULL,
  is_repeatable INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS npc_quest_progress (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  progress_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','completed','claimed')),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (quest_id) REFERENCES npc_quests(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(quest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_world_events_active ON world_events(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_npc_quest_progress_user ON npc_quest_progress(user_id);

