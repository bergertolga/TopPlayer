INSERT OR REPLACE INTO shop_bundles (id, code, name, description, price_crowns, contents_json, is_active, created_at)
VALUES
  ('bundle-crowns-001', 'starter_pack', 'Starter Crowns Pack', 'Kickstart your city with extra crowns and resources.', 100,
   json_object(
     'crowns', 120,
     'coins', 2000,
     'resources', json_object('WOOD', 500, 'STONE', 500, 'FOOD', 500)
   ),
   1, strftime('%s','now')),
  ('bundle-builder-001', 'builder_boost', 'Builder Boost', 'Two instant build tokens plus materials.', 180,
   json_object(
     'boosts', json_array(
       json_object('code','build_speed','hours',2),
       json_object('code','build_instant','hours',0.1)
     ),
     'resources', json_object('WOOD', 800, 'STONE', 800),
     'coins', 3000
   ),
   1, strftime('%s','now')),
  ('bundle-war-001', 'war_chest', 'War Chest', 'Train faster and fund your armies.', 250,
   json_object(
     'coins', 5000,
     'resources', json_object('ORE', 400, 'FOOD', 800),
     'boosts', json_array(
       json_object('code','train_speed','hours',4)
     )
   ),
   1, strftime('%s','now'));

