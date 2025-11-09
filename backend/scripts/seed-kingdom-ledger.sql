-- Seed script for Kingdom Ledger
-- Run via: wrangler d1 execute idle-adventure-db --file=./scripts/seed-kingdom-ledger.sql

-- Seed Resources
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-wood', 'WOOD', 'Wood', 'raw', 1.0, 'Basic building material', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-stone', 'STONE', 'Stone', 'raw', 1.5, 'Sturdy construction material', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-ore', 'ORE', 'Iron Ore', 'raw', 2.0, 'Raw metal for smelting', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-food', 'FOOD', 'Food', 'raw', 0.8, 'Sustains your population', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-fiber', 'FIBER', 'Fiber', 'raw', 1.2, 'Textile material', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-clay', 'CLAY', 'Clay', 'raw', 1.0, 'Pottery and brick material', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-planks', 'PLANKS', 'Planks', 'refined', 3.0, 'Processed wood', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-bricks', 'BRICKS', 'Bricks', 'refined', 4.0, 'Fired clay bricks', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-ingots', 'INGOTS', 'Iron Ingots', 'refined', 5.0, 'Smelted metal', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-fabric', 'FABRIC', 'Fabric', 'refined', 3.5, 'Woven textiles', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-tools', 'TOOLS', 'Tools', 'refined', 8.0, 'Crafted tools for efficiency', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-coal', 'COAL', 'Coal', 'fuel', 2.5, 'Fuel for processing', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-charcoal', 'CHARCOAL', 'Charcoal', 'fuel', 3.0, 'Refined fuel', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-spices', 'SPICES', 'Spices', 'special', 15.0, 'Rare trade goods', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-gems', 'GEMS', 'Gems', 'special', 50.0, 'Precious stones', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-mana', 'MANA', 'Mana', 'special', 20.0, 'Magical energy', 1731000000000);
INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('res-coins', 'COINS', 'Coins', 'special', 1.0, 'Currency', 1731000000000);

-- Seed Buildings (sample - full list in buildings.json)
INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('bld-town-hall', 'TOWN_HALL', 'Town Hall', 'city', '{}', '{}', '{}', 10, '{}', 5, 20, 'Central administration building', 1731000000000);
INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('bld-farm', 'FARM', 'Farm', 'production', '{"FOOD": 20}', '{}', '{}', 5, '{}', 3, 15, 'Produces food', 1731000000000);
INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('bld-lumber-mill', 'LUMBER_MILL', 'Lumber Mill', 'production', '{"WOOD": 15}', '{}', '{}', 4, '{}', 2, 15, 'Harvests wood', 1731000000000);
INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('bld-quarry', 'QUARRY', 'Quarry', 'production', '{"STONE": 12}', '{}', '{}', 5, '{}', 3, 15, 'Mines stone', 1731000000000);
INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('bld-warehouse', 'WAREHOUSE', 'Warehouse', 'city', '{}', '{}', '{}', 2, '{}', 1, 20, 'Increases storage capacity', 1731000000000);
INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('bld-sawmill', 'SAWMILL', 'Sawmill', 'processing', '{}', '{"WOOD": 2}', '{"PLANKS": 1}', 4, '{}', 2, 15, 'Converts wood to planks', 1731000000000);
INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('bld-smelter', 'SMELTER', 'Smelter', 'processing', '{}', '{"ORE": 2, "COAL": 1}', '{"INGOTS": 1}', 6, '{}', 3, 15, 'Smelts ore into ingots', 1731000000000);

-- Seed Regions
INSERT OR IGNORE INTO regions (id, name, tier, wood_bias, ore_bias, food_bias, stone_bias, fiber_bias, clay_bias, max_cities, created_at) VALUES ('region-heartlands', 'Heartlands', 1, 1.3, 0.9, 1.2, 1.0, 1.1, 1.0, 100, 1731000000000);
INSERT OR IGNORE INTO regions (id, name, tier, wood_bias, ore_bias, food_bias, stone_bias, fiber_bias, clay_bias, max_cities, created_at) VALUES ('region-highlands', 'Highlands', 1, 0.8, 1.3, 0.9, 1.2, 0.9, 0.8, 100, 1731000000000);
INSERT OR IGNORE INTO regions (id, name, tier, wood_bias, ore_bias, food_bias, stone_bias, fiber_bias, clay_bias, max_cities, created_at) VALUES ('region-coast', 'Coast', 1, 1.0, 0.7, 1.3, 0.9, 1.2, 1.1, 100, 1731000000000);

-- Seed Governors (sample)
INSERT OR IGNORE INTO governors (id, code, name, rarity, bonus_json, description, created_at) VALUES ('gov-farmer', 'GOV_FARMER', 'Farmer John', 'common', '[{"stat": "production:FOOD", "value": 0.10}]', 'Expert in agricultural production', 1731000000000);
INSERT OR IGNORE INTO governors (id, code, name, rarity, bonus_json, description, created_at) VALUES ('gov-lumberjack', 'GOV_LUMBERJACK', 'Lumberjack Will', 'common', '[{"stat": "production:WOOD", "value": 0.10}]', 'Master of forestry', 1731000000000);
INSERT OR IGNORE INTO governors (id, code, name, rarity, bonus_json, description, created_at) VALUES ('gov-merchant', 'GOV_MERCHANT', 'Merchant Gold', 'rare', '[{"stat": "market:fee", "value": -0.05}, {"stat": "city:happiness", "value": 0.05}]', 'Reduces market fees and boosts happiness', 1731000000000);

-- Seed PvE Nodes
INSERT OR IGNORE INTO pve_nodes (id, region_id, tier, name, power_required, reward_json, respawn_at, status, created_at) VALUES ('pve-bandit-camp-1', 'region-heartlands', 1, 'Bandit Camp', 100, '{"COINS": 50, "FOOD": 20, "chance": 1.0}', 1731003600000, 'active', 1731000000000);
INSERT OR IGNORE INTO pve_nodes (id, region_id, tier, name, power_required, reward_json, respawn_at, status, created_at) VALUES ('pve-bandit-camp-2', 'region-highlands', 1, 'Bandit Camp', 100, '{"COINS": 50, "ORE": 15, "chance": 1.0}', 1731003600000, 'active', 1731000000000);
INSERT OR IGNORE INTO pve_nodes (id, region_id, tier, name, power_required, reward_json, respawn_at, status, created_at) VALUES ('pve-bandit-camp-3', 'region-coast', 1, 'Bandit Camp', 100, '{"COINS": 50, "FIBER": 20, "chance": 1.0}', 1731003600000, 'active', 1731000000000);


