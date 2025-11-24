-- Capital favor tiers and store

CREATE TABLE IF NOT EXISTS capital_favor_tiers (
  tier INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  points_required INTEGER NOT NULL,
  perks_json TEXT NOT NULL,
  reward_json TEXT
);

CREATE TABLE IF NOT EXISTS capital_store_offers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cost_favor INTEGER NOT NULL DEFAULT 0,
  cost_coins INTEGER NOT NULL DEFAULT 0,
  reward_json TEXT NOT NULL,
  min_tier INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS capital_requests (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  resource_code TEXT NOT NULL,
  amount_required INTEGER NOT NULL,
  reward_json TEXT NOT NULL,
  expires_at INTEGER,
  min_tier INTEGER NOT NULL DEFAULT 0
);

