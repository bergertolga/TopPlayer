-- Seed troop types
INSERT OR IGNORE INTO troop_types (id, code, name, category, base_power, base_cost_coins, base_cost_resources_json, upkeep_coins, training_time_seconds, max_level, description, created_at) VALUES
('troop-001', 'MILITIA', 'Militia', 'infantry', 10, 50, '{"FOOD": 5}', 1, 30, 10, 'Basic infantry unit', strftime('%s', 'now')),
('troop-002', 'SWORDSMAN', 'Swordsman', 'infantry', 25, 150, '{"COINS": 100, "INGOTS": 2}', 3, 60, 15, 'Trained swordsman', strftime('%s', 'now')),
('troop-003', 'ARCHER', 'Archer', 'archer', 20, 120, '{"WOOD": 10, "FABRIC": 5}', 2, 45, 15, 'Ranged combat unit', strftime('%s', 'now')),
('troop-004', 'CAVALRY', 'Cavalry', 'cavalry', 40, 300, '{"COINS": 200, "FABRIC": 10, "FOOD": 20}', 5, 90, 15, 'Mounted warrior', strftime('%s', 'now')),
('troop-005', 'KNIGHT', 'Knight', 'cavalry', 60, 500, '{"COINS": 400, "INGOTS": 5, "FABRIC": 15}', 8, 120, 20, 'Elite mounted unit', strftime('%s', 'now')),
('troop-006', 'CROSSBOWMAN', 'Crossbowman', 'archer', 35, 250, '{"WOOD": 15, "INGOTS": 3, "FABRIC": 8}', 4, 75, 15, 'Heavy ranged unit', strftime('%s', 'now')),
('troop-007', 'CATAPULT', 'Catapult', 'siege', 80, 800, '{"WOOD": 50, "INGOTS": 10, "TOOLS": 5}', 15, 180, 20, 'Siege weapon', strftime('%s', 'now')),
('troop-008', 'SPEARMAN', 'Spearman', 'infantry', 18, 100, '{"WOOD": 8, "INGOTS": 1}', 2, 40, 12, 'Polearm infantry', strftime('%s', 'now'));

