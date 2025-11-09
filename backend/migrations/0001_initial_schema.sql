-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  created_at INTEGER NOT NULL,
  last_active INTEGER NOT NULL,
  total_spent REAL DEFAULT 0,
  prestige_count INTEGER DEFAULT 0,
  server_region TEXT DEFAULT 'global'
);

-- Heroes table (static data)
CREATE TABLE IF NOT EXISTS heroes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL, -- common, rare, epic, legendary
  base_power INTEGER NOT NULL,
  upgrade_cost_base INTEGER NOT NULL,
  unlock_requirement TEXT,
  description TEXT,
  element TEXT, -- fire, water, earth, air, etc.
  created_at INTEGER NOT NULL
);

-- User heroes (owned heroes with levels)
CREATE TABLE IF NOT EXISTS user_heroes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hero_id TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  stars INTEGER DEFAULT 0,
  experience INTEGER DEFAULT 0,
  equipped_weapon_id TEXT,
  equipped_armor_id TEXT,
  equipped_accessory_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (hero_id) REFERENCES heroes(id),
  UNIQUE(user_id, hero_id)
);

-- Adventures (stages)
CREATE TABLE IF NOT EXISTS adventures (
  id TEXT PRIMARY KEY,
  stage_number INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  enemy_power INTEGER NOT NULL,
  reward_coins INTEGER NOT NULL,
  reward_gems INTEGER DEFAULT 0,
  reward_hero_shards TEXT, -- JSON array of hero_id:count
  energy_cost INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- User adventure progress
CREATE TABLE IF NOT EXISTS user_adventure_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  adventure_id TEXT NOT NULL,
  stars_earned INTEGER DEFAULT 0, -- 0-3 stars
  completed_at INTEGER,
  best_time INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (adventure_id) REFERENCES adventures(id),
  UNIQUE(user_id, adventure_id)
);

-- User progress (game state)
CREATE TABLE IF NOT EXISTS user_progress (
  user_id TEXT PRIMARY KEY,
  total_currency INTEGER DEFAULT 0,
  premium_currency INTEGER DEFAULT 0,
  energy INTEGER DEFAULT 100,
  max_energy INTEGER DEFAULT 100,
  current_adventure_stage INTEGER DEFAULT 1,
  last_offline_calculation INTEGER,
  data JSON, -- Flexible JSON for additional game state
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Purchases (IAP transactions)
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  receipt_data TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  verified BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Upgrades (global and hero-specific)
CREATE TABLE IF NOT EXISTS upgrades (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- global, hero_specific
  hero_id TEXT, -- NULL for global upgrades
  cost_coins INTEGER,
  cost_gems INTEGER,
  effect_type TEXT NOT NULL, -- multiplier, add_value, unlock_feature
  effect_value REAL NOT NULL,
  max_level INTEGER DEFAULT 1,
  description TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (hero_id) REFERENCES heroes(id)
);

-- User upgrades
CREATE TABLE IF NOT EXISTS user_upgrades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  upgrade_id TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  purchased_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (upgrade_id) REFERENCES upgrades(id),
  UNIQUE(user_id, upgrade_id)
);

-- Equipment
CREATE TABLE IF NOT EXISTS equipment (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- weapon, armor, accessory
  rarity TEXT NOT NULL,
  base_power INTEGER NOT NULL,
  stat_bonus TEXT, -- JSON: {power: 100, health: 50}
  description TEXT,
  created_at INTEGER NOT NULL
);

-- User equipment
CREATE TABLE IF NOT EXISTS user_equipment (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  enhancement_level INTEGER DEFAULT 0,
  is_equipped BOOLEAN DEFAULT FALSE,
  equipped_to_hero_id TEXT,
  obtained_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (equipment_id) REFERENCES equipment(id),
  FOREIGN KEY (equipped_to_hero_id) REFERENCES user_heroes(id)
);

-- Daily rewards
CREATE TABLE IF NOT EXISTS daily_rewards (
  id TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL UNIQUE,
  reward_type TEXT NOT NULL, -- coins, gems, hero_shard, equipment
  reward_value INTEGER NOT NULL,
  reward_data TEXT, -- JSON for specific rewards
  created_at INTEGER NOT NULL
);

-- User daily rewards tracking
CREATE TABLE IF NOT EXISTS user_daily_rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  last_claim_date INTEGER NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- progression, combat, collection, social
  requirement_type TEXT NOT NULL, -- reach_level, collect_heroes, complete_stages
  requirement_value INTEGER NOT NULL,
  reward_type TEXT,
  reward_value INTEGER,
  reward_data TEXT,
  created_at INTEGER NOT NULL
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (achievement_id) REFERENCES achievements(id),
  UNIQUE(user_id, achievement_id)
);

-- Analytics events
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_heroes_user ON user_heroes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_heroes_hero ON user_heroes(hero_id);
CREATE INDEX IF NOT EXISTS idx_user_adventure_user ON user_adventure_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_transaction ON purchases(transaction_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);


