-- Army/Troops system for adventure mode
CREATE TABLE IF NOT EXISTS troop_types (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('infantry', 'cavalry', 'archer', 'siege', 'special')),
  base_power INTEGER NOT NULL,
  base_cost_coins INTEGER NOT NULL,
  base_cost_resources_json TEXT, -- JSON: {resource_code: amount}
  upkeep_coins INTEGER DEFAULT 0,
  training_time_seconds INTEGER DEFAULT 60,
  max_level INTEGER DEFAULT 10,
  description TEXT,
  created_at INTEGER NOT NULL
);

-- City troops (army units)
CREATE TABLE IF NOT EXISTS city_troops (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  troop_type_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  experience INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (troop_type_id) REFERENCES troop_types(id),
  UNIQUE(city_id, troop_type_id)
);

-- Army formations (for adventure mode)
CREATE TABLE IF NOT EXISTS army_formations (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  name TEXT NOT NULL,
  troop_quantities_json TEXT NOT NULL DEFAULT '{}', -- JSON: {troop_type_id: quantity}
  total_power INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (city_id) REFERENCES cities(id)
);

