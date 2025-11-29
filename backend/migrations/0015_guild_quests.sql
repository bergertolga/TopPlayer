-- Merge guild archetypes into councils and add guild quests

ALTER TABLE councils ADD COLUMN guild_code TEXT;
CREATE INDEX IF NOT EXISTS idx_councils_guild_code ON councils(guild_code);

CREATE TABLE IF NOT EXISTS guild_quests (
  id TEXT PRIMARY KEY,
  guild_code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requirement_json TEXT NOT NULL,
  reward_json TEXT NOT NULL,
  resets_at INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (guild_code) REFERENCES guild_archetypes(code)
);

CREATE TABLE IF NOT EXISTS guild_quest_progress (
  id TEXT PRIMARY KEY,
  quest_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('active','completed','claimed')),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (quest_id) REFERENCES guild_quests(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(quest_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_quest_progress_user ON guild_quest_progress(user_id);


