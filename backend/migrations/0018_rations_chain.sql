-- Rations resource chain and troop upkeep data

ALTER TABLE troop_types ADD COLUMN upkeep_resources_json TEXT DEFAULT '{}';

INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at)
VALUES ('res-rations', 'RATIONS', 'Rations', 'consumable', 2.2, 'Preserved meals for armies', strftime('%s','now') * 1000);

INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, unlock_level, created_at)
VALUES ('bld-rations-kitchen', 'RATIONS_KITCHEN', 'Rations Kitchen', 'processing', '{}', '{"FOOD": 4}', '{"RATIONS": 3}', 4, '{}', 2, 10, 'Turns food stores into preserved rations', 3, strftime('%s','now') * 1000);

UPDATE troop_types
SET upkeep_resources_json = '{"RATIONS":1}'
WHERE upkeep_resources_json IS NULL OR upkeep_resources_json = '{}';

UPDATE troop_types
SET upkeep_resources_json = '{"RATIONS":2}'
WHERE code IN ('CAVALRY', 'KNIGHT');

INSERT INTO city_resources (city_id, resource_id, amount, protected)
SELECT c.id, r.id, 50, 0
FROM cities c
JOIN resources r ON r.code = 'RATIONS'
WHERE NOT EXISTS (
  SELECT 1 FROM city_resources cr WHERE cr.city_id = c.id AND cr.resource_id = r.id
);

