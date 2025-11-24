-- Building unlock levels and advanced route columns

ALTER TABLE buildings ADD COLUMN unlock_level INTEGER DEFAULT 1;

ALTER TABLE routes ADD COLUMN destination_city_id TEXT;
ALTER TABLE routes ADD COLUMN in_transit_qty REAL DEFAULT 0;
ALTER TABLE routes ADD COLUMN arrival_at INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_routes_destination ON routes(destination_city_id);

