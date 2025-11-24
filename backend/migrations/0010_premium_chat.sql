-- Premium currency & social tables

CREATE TABLE IF NOT EXISTS premium_balances (
  user_id TEXT PRIMARY KEY,
  crowns INTEGER NOT NULL DEFAULT 0,
  last_stipend_claimed INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS shop_bundles (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_crowns INTEGER NOT NULL,
  contents_json TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS boost_activations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  boost_code TEXT NOT NULL,
  metadata_json TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS world_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_world_messages_created ON world_messages(created_at DESC);

CREATE TABLE IF NOT EXISTS dm_conversations (
  id TEXT PRIMARY KEY,
  participant_a TEXT NOT NULL,
  participant_b TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(participant_a, participant_b),
  FOREIGN KEY (participant_a) REFERENCES users(id),
  FOREIGN KEY (participant_b) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dm_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES dm_conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dm_messages_convo ON dm_messages(conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS capital_favor_stats (
  user_id TEXT PRIMARY KEY,
  favor_points INTEGER NOT NULL DEFAULT 0,
  last_contribution INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS capital_announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);


