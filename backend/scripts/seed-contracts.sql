-- Seed handcrafted capital contracts
INSERT OR IGNORE INTO capital_contracts (id, code, chapter, title, description, resource_code, amount_required, reward_coins, created_at) VALUES
  ('contract-001', 'capital_supplies_1', 1, 'Capital Supplies I', 'Deliver wood to help rebuild the capital gates.', 'WOOD', 500, 750, strftime('%s','now')*1000),
  ('contract-002', 'capital_supplies_2', 1, 'Stone Reinforcements', 'Reinforce the capital walls with stone blocks.', 'STONE', 400, 900, strftime('%s','now')*1000),
  ('contract-003', 'capital_rations', 2, 'City Rations', 'Provide food for the refugees arriving daily.', 'FOOD', 800, 1200, strftime('%s','now')*1000);

