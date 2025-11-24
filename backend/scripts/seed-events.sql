INSERT OR IGNORE INTO world_events (id, code, name, description, event_type, starts_at, ends_at, metadata_json, created_at)
VALUES
  ('event-001', 'harvest_festival', 'Harvest Festival', 'Boost food production and turn in surplus for rewards.', 'festival',
   strftime('%s','now')*1000, strftime('%s','now','+3 days')*1000,
   json_object('resource','FOOD','goal',5000,'rewardCoins',2000,'rewardCrowns',15),
   strftime('%s','now')*1000),
  ('event-002', 'border_incursion', 'Border Incursion', 'Send troops to repel invaders for the capital.', 'invasion',
   strftime('%s','now')*1000, strftime('%s','now','+2 days')*1000,
   json_object('troopRequired',300,'rewardFavor',10,'rewardBoost',json_object('code','army_morale','hours',6)),
   strftime('%s','now')*1000);

INSERT OR IGNORE INTO npc_quests (id, npc_name, title, description, requirements_json, rewards_json, is_repeatable, created_at)
VALUES
  ('quest-001', 'Trader Lio', 'Escort the Caravan', 'Protect Lio''s caravan using at least 100 troops.', 
   json_object('troops',100,'durationHours',4),
   json_object('coins',1500,'crowns',5),
   1, strftime('%s','now')*1000),
  ('quest-002', 'Sergeant Mira', 'Reinforce the Gate', 'Deliver 800 stone to fortify the capital gate.',
   json_object('resource','STONE','amount',800),
   json_object('favor',8,'boost',json_object('code','build_speed','hours',3)),
   0, strftime('%s','now')*1000);

