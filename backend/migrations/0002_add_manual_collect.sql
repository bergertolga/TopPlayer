-- Migration number: 0002 	 2024-05-22T00:00:00.000Z
-- Add last_collected_at and unclaimed_amount to city_buildings for manual collection
ALTER TABLE city_buildings ADD COLUMN last_collected_at INTEGER DEFAULT 0;
ALTER TABLE city_buildings ADD COLUMN unclaimed_amount REAL DEFAULT 0;


