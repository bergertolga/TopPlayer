
-- Phase 5: Social & Economic Meta
-- 0026_phase5_social.sql

PRAGMA foreign_keys = ON;

-- 1. Council Identity & Prestige
ALTER TABLE councils ADD COLUMN badge_id TEXT REFERENCES premium_items(id);
ALTER TABLE councils ADD COLUMN motto TEXT;
ALTER TABLE councils ADD COLUMN primary_focus TEXT CHECK(primary_focus IN ('economy', 'military', 'culture', 'trade'));
ALTER TABLE councils ADD COLUMN prestige_score REAL NOT NULL DEFAULT 0;

-- 2. Event Scoping
-- Add scope to definitions (e.g. city, council, kingdom)
ALTER TABLE event_definitions ADD COLUMN scope TEXT NOT NULL DEFAULT 'city' CHECK(scope IN ('city', 'council', 'kingdom'));

-- 3. Cosmetics & Ownership
-- We can reuse user_premium_items for general items, but let's add specific tracking for equipped cosmetics
-- Actually, `city_collectibles` is good for city-level, but we need Council-level cosmetics.

CREATE TABLE IF NOT EXISTS council_cosmetics (
  id TEXT PRIMARY KEY,
  council_id TEXT NOT NULL,
  cosmetic_code TEXT NOT NULL,
  is_equipped INTEGER DEFAULT 0,
  acquired_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  FOREIGN KEY (council_id) REFERENCES councils(id) ON DELETE CASCADE,
  FOREIGN KEY (cosmetic_code) REFERENCES premium_items(code) ON DELETE CASCADE,
  UNIQUE(council_id, cosmetic_code)
);

-- Index for quick prestige lookup
CREATE INDEX IF NOT EXISTS idx_councils_prestige ON councils(prestige_score DESC);

