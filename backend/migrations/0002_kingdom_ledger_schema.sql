-- Kingdom Ledger Schema Migration
-- This replaces the hero/adventure system with economy/city system

-- Regions table
CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier INTEGER DEFAULT 1,
  wood_bias REAL DEFAULT 1.0,
  ore_bias REAL DEFAULT 1.0,
  food_bias REAL DEFAULT 1.0,
  stone_bias REAL DEFAULT 1.0,
  fiber_bias REAL DEFAULT 1.0,
  clay_bias REAL DEFAULT 1.0,
  event_tag TEXT,
  max_cities INTEGER DEFAULT 100,
  created_at INTEGER NOT NULL
);

-- Resources table (static definitions)
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('raw', 'refined', 'special', 'fuel')),
  base_value REAL NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL
);

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  region_id TEXT NOT NULL,
  name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  population INTEGER DEFAULT 100,
  happiness REAL DEFAULT 0.9 CHECK(happiness >= 0 AND happiness <= 1),
  prestige_count INTEGER DEFAULT 0,
  shield_until INTEGER DEFAULT 0,
  last_tick INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- City resources (inventory)
CREATE TABLE IF NOT EXISTS city_resources (
  city_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  amount REAL DEFAULT 0,
  protected REAL DEFAULT 0,
  PRIMARY KEY (city_id, resource_id),
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Buildings table (static definitions)
CREATE TABLE IF NOT EXISTS buildings (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('production', 'processing', 'city', 'military', 'logistics')),
  base_production_json TEXT, -- JSON: {resource_code: amount_per_minute}
  input_resources_json TEXT, -- JSON: {resource_code: amount_per_minute} for processing
  output_resources_json TEXT, -- JSON: {resource_code: amount_per_minute} for processing
  upkeep_coins INTEGER DEFAULT 0,
  upkeep_resources_json TEXT, -- JSON: {resource_code: amount_per_minute}
  workers_required INTEGER DEFAULT 0,
  max_level INTEGER DEFAULT 10,
  description TEXT,
  created_at INTEGER NOT NULL
);

-- City buildings (user-owned buildings)
CREATE TABLE IF NOT EXISTS city_buildings (
  city_id TEXT NOT NULL,
  building_id TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  workers INTEGER DEFAULT 0,
  fuel_resource_id TEXT,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  last_production INTEGER DEFAULT 0,
  PRIMARY KEY (city_id, building_id),
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (building_id) REFERENCES buildings(id),
  FOREIGN KEY (fuel_resource_id) REFERENCES resources(id)
);

-- Governors table (static definitions - like heroes but for economy)
CREATE TABLE IF NOT EXISTS governors (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')),
  bonus_json TEXT NOT NULL, -- JSON: [{"stat": "production:WOOD", "value": 0.12}, ...]
  description TEXT,
  created_at INTEGER NOT NULL
);

-- City governors (assigned governors)
CREATE TABLE IF NOT EXISTS city_governors (
  city_id TEXT NOT NULL,
  governor_id TEXT NOT NULL,
  slot TEXT NOT NULL CHECK(slot IN ('city', 'building')),
  assigned_building_id TEXT,
  PRIMARY KEY (city_id, governor_id),
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (governor_id) REFERENCES governors(id)
  -- Note: assigned_building_id references a composite key, so we can't use FOREIGN KEY constraint
  -- Validation should be done at application level
);

-- Market orders
CREATE TABLE IF NOT EXISTS market_orders (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK(side IN ('buy', 'sell')),
  price REAL NOT NULL CHECK(price > 0),
  qty REAL NOT NULL CHECK(qty > 0),
  qty_filled REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'filled', 'cancelled', 'expired')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER,
  last_match_at INTEGER,
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Trades (executed trades)
CREATE TABLE IF NOT EXISTS trades (
  id TEXT PRIMARY KEY,
  buy_order_id TEXT NOT NULL,
  sell_order_id TEXT NOT NULL,
  city_id_buyer TEXT NOT NULL,
  city_id_seller TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  price REAL NOT NULL,
  qty REAL NOT NULL,
  fee REAL NOT NULL,
  tax REAL NOT NULL,
  traded_at INTEGER NOT NULL,
  FOREIGN KEY (buy_order_id) REFERENCES market_orders(id),
  FOREIGN KEY (sell_order_id) REFERENCES market_orders(id),
  FOREIGN KEY (city_id_buyer) REFERENCES cities(id),
  FOREIGN KEY (city_id_seller) REFERENCES cities(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Price history (OHLCV data)
CREATE TABLE IF NOT EXISTS price_ohlcv (
  resource_id TEXT NOT NULL,
  bucket_start INTEGER NOT NULL,
  bucket TEXT NOT NULL CHECK(bucket IN ('15m', '1h', '24h')),
  open REAL NOT NULL,
  high REAL NOT NULL,
  low REAL NOT NULL,
  close REAL NOT NULL,
  volume REAL NOT NULL,
  PRIMARY KEY (resource_id, bucket, bucket_start),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Routes (logistics)
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  from_region_id TEXT NOT NULL,
  to_region_id TEXT NOT NULL,
  capacity REAL NOT NULL,
  resource_id TEXT NOT NULL,
  qty_per_trip REAL NOT NULL,
  cycle_minutes INTEGER NOT NULL,
  escort_level INTEGER DEFAULT 0,
  repeats INTEGER DEFAULT -1, -- -1 = infinite
  next_departure INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (from_region_id) REFERENCES regions(id),
  FOREIGN KEY (to_region_id) REFERENCES regions(id),
  FOREIGN KEY (resource_id) REFERENCES resources(id)
);

-- Councils (guilds)
CREATE TABLE IF NOT EXISTS councils (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  steward_user_id TEXT NOT NULL,
  region_id TEXT NOT NULL,
  tax_rate REAL DEFAULT 0.01 CHECK(tax_rate >= 0 AND tax_rate <= 0.05),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (steward_user_id) REFERENCES users(id),
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- Council members
CREATE TABLE IF NOT EXISTS council_members (
  council_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('steward', 'officer', 'member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (council_id, user_id),
  FOREIGN KEY (council_id) REFERENCES councils(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Public works (council projects)
CREATE TABLE IF NOT EXISTS public_works (
  id TEXT PRIMARY KEY,
  council_id TEXT NOT NULL,
  project_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  required_resources_json TEXT NOT NULL, -- JSON: {resource_code: amount}
  contributed_resources_json TEXT NOT NULL DEFAULT '{}', -- JSON: {resource_code: amount}
  completion_percentage REAL DEFAULT 0,
  region_bonus_json TEXT, -- JSON: bonus when completed
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (council_id) REFERENCES councils(id)
);

-- PvE nodes (bandit camps, etc.)
CREATE TABLE IF NOT EXISTS pve_nodes (
  id TEXT PRIMARY KEY,
  region_id TEXT NOT NULL,
  tier INTEGER NOT NULL,
  name TEXT NOT NULL,
  power_required INTEGER NOT NULL,
  reward_json TEXT NOT NULL, -- JSON: {resource_code: amount, chance}
  respawn_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'defeated', 'respawning')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- User PvE progress
CREATE TABLE IF NOT EXISTS user_pve_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  defeated_at INTEGER,
  times_defeated INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (node_id) REFERENCES pve_nodes(id),
  UNIQUE(user_id, node_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cities_user ON cities(user_id);
CREATE INDEX IF NOT EXISTS idx_cities_region ON cities(region_id);
CREATE INDEX IF NOT EXISTS idx_city_resources_city ON city_resources(city_id);
CREATE INDEX IF NOT EXISTS idx_city_buildings_city ON city_buildings(city_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_resource_side_status ON market_orders(resource_id, side, status, price, created_at);
CREATE INDEX IF NOT EXISTS idx_market_orders_city ON market_orders(city_id);
CREATE INDEX IF NOT EXISTS idx_trades_resource_time ON trades(resource_id, traded_at);
CREATE INDEX IF NOT EXISTS idx_trades_city_buyer ON trades(city_id_buyer);
CREATE INDEX IF NOT EXISTS idx_trades_city_seller ON trades(city_id_seller);
CREATE INDEX IF NOT EXISTS idx_price_ohlcv_resource_bucket ON price_ohlcv(resource_id, bucket, bucket_start);
CREATE INDEX IF NOT EXISTS idx_routes_city ON routes(city_id);
CREATE INDEX IF NOT EXISTS idx_routes_next_departure ON routes(next_departure, status);
CREATE INDEX IF NOT EXISTS idx_council_members_user ON council_members(user_id);
CREATE INDEX IF NOT EXISTS idx_council_members_council ON council_members(council_id);
CREATE INDEX IF NOT EXISTS idx_pve_nodes_region_respawn ON pve_nodes(region_id, respawn_at, status);

-- Add coins to city_resources as a special resource
-- Coins will be tracked in city_resources with resource code 'COINS'


