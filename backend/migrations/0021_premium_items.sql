-- Premium currencies, collectibles, and monetization hooks

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS premium_currencies (
  user_id TEXT PRIMARY KEY,
  crowns INTEGER NOT NULL DEFAULT 0,
  gems INTEGER NOT NULL DEFAULT 0,
  favor INTEGER NOT NULL DEFAULT 0,
  last_stipend_claim INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS premium_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  delta_crowns INTEGER DEFAULT 0,
  delta_gems INTEGER DEFAULT 0,
  delta_favor INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  metadata_json TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS premium_items (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  rarity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  payload_json TEXT NOT NULL,
  price_crowns INTEGER,
  price_gems INTEGER,
  limited_run INTEGER DEFAULT 0,
  available_from INTEGER,
  available_to INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE TABLE IF NOT EXISTS city_collectibles (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  collectible_code TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  payload_json TEXT,
  owned_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
  UNIQUE (city_id, collectible_code)
);

CREATE TABLE IF NOT EXISTS user_premium_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  premium_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT,
  acquired_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (premium_item_id) REFERENCES premium_items(id) ON DELETE CASCADE,
  UNIQUE (user_id, premium_item_id)
);

CREATE INDEX IF NOT EXISTS idx_premium_ledger_user ON premium_ledger(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_premium_items_type ON premium_items(type);
CREATE INDEX IF NOT EXISTS idx_city_collectibles_city ON city_collectibles(city_id);

-- Seed baseline premium items reflecting docs/premium-economy.md
INSERT OR IGNORE INTO premium_items (id, code, type, rarity, title, description, payload_json, price_crowns, limited_run)
VALUES
  ('premium-daily-supply', 'DAILY_SUPPLY_CRATE', 'bundle', 'rare', 'Daily Supply Crate', '5h production skip + 10 contract refresh tokens', '{"speedUps":{"productionHours":5},"contractRefresh":10}', 50, 1),
  ('premium-builder-pack', 'BUILDER_PACK', 'bundle', 'epic', 'Builder Pack', 'Instant upgrades + wood/stone', '{"instantUpgrades":2,"resources":{"WOOD":500,"STONE":500}}', 120, 0),
  ('premium-war-chest', 'WAR_CHEST', 'bundle', 'epic', 'War Chest', 'Troop speed-ups and morale boosts', '{"speedUps":{"trainingMinutes":60},"effects":{"morale":0.1}}', 200, 0),
  ('premium-realm-founder', 'REALM_FOUNDER', 'bundle', 'legendary', 'Realm Founder Pack', 'Relocation + council crest rename + favor', '{"relocationVouchers":1,"councilCrestRenames":1,"favor":30}', 400, 0);

-- Backfill legacy premium_balances table into the new wallet
-- Check if legacy table exists first to avoid errors in fresh environments
-- But we can't do conditional logic in pure SQL script easily without dynamic SQL.
-- Assuming premium_balances exists if we are migrating.
INSERT OR IGNORE INTO premium_currencies (user_id, crowns, gems, favor, last_stipend_claim, updated_at)
SELECT user_id, crowns, 0, 0, last_stipend_claimed, COALESCE(last_stipend_claimed, strftime('%s','now') * 1000)
FROM premium_balances;
