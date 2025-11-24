INSERT OR REPLACE INTO capital_favor_tiers (tier, name, points_required, perks_json, reward_json) VALUES
  (0, 'Citizen', 0, json_object('storeDiscount', 0), NULL),
  (1, 'Envoy', 25, json_object('storeDiscount', 0.05, 'contractBonus', 0.05), json_object('crowns', 5)),
  (2, 'Steward', 75, json_object('storeDiscount', 0.1, 'productionBuff', 0.05), json_object('crowns', 10, 'boost', json_object('code','build_speed','hours',4))),
  (3, 'Champion', 150, json_object('storeDiscount', 0.15, 'armyBuff', 0.1), json_object('crowns', 15, 'coins', 5000));

INSERT OR REPLACE INTO capital_store_offers (id, code, name, description, cost_favor, cost_coins, reward_json, min_tier) VALUES
  ('offer-001', 'fabric_bundle', 'Royal Fabric Bundle', 'Purchase refined fabric for troop equipment.', 5, 800,
   json_object('resources', json_object('FABRIC', 120)), 0),
  ('offer-002', 'artisan_tools', 'Artisan Tool Crate', 'Boost building upgrades with fine tools.', 8, 1200,
   json_object('resources', json_object('TOOLS', 60)), 1),
  ('offer-003', 'royal_boost', 'Royal Build Boost', 'Instant build boost token.', 10, 0,
   json_object('boosts', json_array(json_object('code','build_instant','hours',0.1))), 2);

INSERT OR REPLACE INTO capital_requests (id, code, name, description, resource_code, amount_required, reward_json, expires_at, min_tier) VALUES
  ('req-001', 'grain_relief', 'Grain Relief', 'Send 1,000 food to feed refugees.', 'FOOD', 1000,
   json_object('favor', 6, 'coins', 1200), NULL, 0),
  ('req-002', 'stone_bastion', 'Stone Bastion', 'Deliver 900 stone for the new bastion.', 'STONE', 900,
   json_object('favor', 7, 'boost', json_object('code','build_speed','hours',2)), NULL, 1);

