-- Extend events with phases and add guild archetypes

ALTER TABLE world_events ADD COLUMN phases_json TEXT DEFAULT '[]';

CREATE TABLE IF NOT EXISTS event_phase_progress (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  current_phase INTEGER NOT NULL DEFAULT 0,
  phase_progress INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES world_events(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS guild_archetypes (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  perk_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guild_membership (
  user_id TEXT PRIMARY KEY,
  guild_code TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  FOREIGN KEY (guild_code) REFERENCES guild_archetypes(code),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

