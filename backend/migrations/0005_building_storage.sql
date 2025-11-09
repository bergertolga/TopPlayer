-- Add building storage capacity and current storage
ALTER TABLE city_buildings ADD COLUMN storage_capacity REAL DEFAULT 1000;
ALTER TABLE city_buildings ADD COLUMN storage_json TEXT DEFAULT '{}'; -- JSON: {resource_code: amount}
ALTER TABLE city_buildings ADD COLUMN last_collected INTEGER DEFAULT 0;

-- Update existing buildings to have default storage
UPDATE city_buildings SET storage_capacity = 1000, storage_json = '{}', last_collected = last_production WHERE storage_capacity IS NULL;

