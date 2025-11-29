-- Hospital System
-- 0025_hospital_system.sql

CREATE TABLE IF NOT EXISTS city_wounded (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  troop_type_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 0,
  timestamp INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (city_id) REFERENCES cities(id),
  FOREIGN KEY (troop_type_id) REFERENCES troop_types(id),
  UNIQUE(city_id, troop_type_id)
);

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_city_wounded_city ON city_wounded(city_id);

