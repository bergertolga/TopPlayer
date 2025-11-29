-- Seed script for live simulation configuration knobs
-- Run via: wrangler d1 execute <DB> --file backend/scripts/seed-config.sql

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO sim_config_groups (id, code, description)
VALUES
  ('cfg-tier', 'tier_pacing', 'Level thresholds and tier pacing targets'),
  ('cfg-policy', 'policy_profiles', 'Behavior per policy archetype'),
  ('cfg-build-order', 'building_behavior_overrides', 'Construction order and desired levels'),
  ('cfg-building-output', 'building_output', 'Per-building resource yield'),
  ('cfg-city-start', 'city_start', 'Initial city state for new simulations'),
  ('cfg-balance', 'balance_rules', 'City production & happiness tuning'),
  ('cfg-economy', 'economy_flags', 'Misc economy toggles for sim');

-- TUNED VALUES (Phase 2 - Iteration 2)
INSERT OR REPLACE INTO sim_config_values (id, group_id, key, value_json)
VALUES
  (
    'cfg-tier-default',
    'cfg-tier',
    'default',
    json_object(
      'levelThresholds', json('[0, 220, 650, 2100, 5200, 9000, 14000, 20000, 27000, 34000]'),
      'econBaseline', 360,
      'tierTicks', json_object(
        'Settlement', 65,
        'Hamlet', 100,
        'Town', 740,
        'City', 1950
      )
    )
  ),
  ('cfg-policy-balanced', 'cfg-policy', 'balanced', json_object('troopFocus', 0.22, 'coinBuffer', 180, 'rationBuffer', 28, 'troopBatch', 4)),
  ('cfg-policy-militarist', 'cfg-policy', 'militarist', json_object('troopFocus', 0.40, 'coinBuffer', 140, 'rationBuffer', 22, 'troopBatch', 6)),
  ('cfg-policy-trader', 'cfg-policy', 'trader', json_object('troopFocus', 0.12, 'coinBuffer', 280, 'rationBuffer', 20, 'troopBatch', 2)),
  (
    'cfg-build-order-balanced',
    'cfg-build-order',
    'balanced',
    json_object(
      'constructionOrder', json('["rations_kitchen","farm","lumber_mill","quarry","barracks","market","warehouse"]'),
      'desiredLevels', json_object('barracks', 2, 'market', 2, 'default', 3)
    )
  ),
  (
    'cfg-build-order-militarist',
    'cfg-build-order',
    'militarist',
    json_object(
      'constructionOrder', json('["rations_kitchen","barracks","farm","lumber_mill","quarry","market"]'),
      'desiredLevels', json_object('barracks', 4, 'default', 3)
    )
  ),
  (
    'cfg-build-order-trader',
    'cfg-build-order',
    'trader',
    json_object(
      'constructionOrder', json('["market","warehouse","farm","lumber_mill","quarry","rations_kitchen"]'),
      'desiredLevels', json_object('market', 4, 'warehouse', 4, 'rations_kitchen', 1, 'default', 3)
    )
  ),
  (
    'cfg-building-output-default',
    'cfg-building-output',
    'default',
    json_object(
      'farm', json_object('FOOD', 3),
      'lumber_mill', json_object('WOOD', 2),
      'quarry', json_object('STONE', 2),
      'market', json_object(),
      'warehouse', json_object(),
      'barracks', json_object(),
      'rations_kitchen', json_object()
    )
  ),
  (
    'cfg-city-start-default',
    'cfg-city-start',
    'default',
    json_object(
      'level', 1,
      'populationRange', json_object('min', 150, 'variance', 80),
      'happiness', 0.92,
      'coins', 1200,
      'resources', json_object(
        'FOOD', 320,
        'WOOD', 200,
        'STONE', 160,
        'RATIONS', 60,
        'FIBER', 100
      ),
      'buildings', json_object(
        'farm', json_object('balanced', 3, 'militarist', 2, 'trader', 3),
        'lumber_mill', 1,
        'quarry', 1,
        'market', json_object('trader', 2, 'default', 1),
        'warehouse', json_object('trader', 2, 'default', 1),
        'rations_kitchen', json_object('trader', 0, 'default', 1),
        'barracks', json_object('militarist', 1, 'default', 0)
      )
    )
  ),
  (
    'cfg-balance-default',
    'cfg-balance',
    'default',
    json_object(
      'production', json_object('baseMultiplierPerLevel', 0.15),
      'refining', json_object('baseEfficiency', 0.9, 'efficiencyPerLevel', 0.02),
      'happiness', json_object('foodDeficitPenalty', -0.1, 'fabricDeficitPenalty', -0.05, 'festivalBonus', 0.02, 'min', 0.0, 'max', 1.0),
      'warehouse', json_object('baseCapacity', 5000, 'capacityMultiplier', 1.5)
    )
  ),
  (
    'cfg-economy-default',
    'cfg-economy',
    'default',
    json_object(
      'lateGameCoinTarget', 120000,
      'militarizationTarget', 0.35,
      'purchasePressureTarget', 0.3
    )
  );

-- Council Tech Tree Expansion
INSERT OR IGNORE INTO council_tech_tree (id, code, name, description, tier, cost_json, prerequisites_json, buff_json)
VALUES
  ('tech-guild-tax', 'GUILD_TAX', 'Guild Tax Codes', 'Increase coin production by 5%', 1, '{"COINS":5000}', '[]', '{"production":{"COINS":0.05}}'),
  ('tech-trade-routes', 'TRADE_ROUTES', 'Protected Routes', 'Trade speed +10%', 2, '{"COINS":10000,"WOOD":2000}', '["GUILD_TAX"]', '{"trade":{"speed":0.10}}'),
  ('tech-master-merchants', 'MASTER_MERCHANTS', 'Master Merchants', 'Market capacity +20%', 3, '{"COINS":25000,"RATIONS":5000}', '["TRADE_ROUTES"]', '{"market":{"capacity":0.20}}'),
  ('tech-conscription', 'CONSCRIPTION', 'Conscription', 'Training speed +10%', 1, '{"COINS":5000,"RATIONS":1000}', '[]', '{"combat":{"trainSpeed":0.10}}'),
  ('tech-steel-weapons', 'STEEL_WEAPONS', 'Steel Weapons', 'Troop power +5%', 2, '{"COINS":15000,"STONE":3000}', '["CONSCRIPTION"]', '{"combat":{"power":0.05}}'),
  ('tech-siege-craft', 'SIEGE_CRAFT', 'Siege Craft', 'Siege efficiency +15%', 3, '{"COINS":40000,"WOOD":5000}', '["STEEL_WEAPONS"]', '{"combat":{"siege":0.15}}'),
  ('tech-festivals', 'FESTIVALS', 'Grand Festivals', 'Happiness decay -10%', 1, '{"COINS":3000,"FOOD":5000}', '[]', '{"happiness":{"decay":-0.10}}'),
  ('tech-diplomacy', 'DIPLOMACY', 'Diplomacy', 'Favor gain +10%', 2, '{"COINS":10000,"RATIONS":2000}', '["FESTIVALS"]', '{"social":{"favorBonus":0.10}}'),
  ('tech-council-hall', 'COUNCIL_HALL', 'Grand Hall', 'Member cap +5', 3, '{"COINS":50000,"STONE":5000}', '["DIPLOMACY"]', '{"social":{"memberCap":5}}');

-- Council Projects
INSERT OR IGNORE INTO council_project_defs (id, code, name, description, required_resources_json, buff_json)
VALUES
  ('proj-market-square', 'MARKET_SQUARE', 'Grand Market Square', 'Reduces transaction fees for all members', '{"STONE":10000,"WOOD":10000,"COINS":50000}', '{"market":{"feeReduction":0.005}}'),
  ('proj-fortress-walls', 'FORTRESS_WALLS', 'Fortress Walls', 'Increases defense against raids', '{"STONE":25000,"RATIONS":10000}', '{"combat":{"defense":0.10}}');

-- Premium Items (Updated Phase 3)
INSERT OR IGNORE INTO premium_items (id, code, type, rarity, title, description, payload_json, price_crowns, limited_run)
VALUES
  ('item-speed-1h', 'SPEED_1H', 'consumable', 'common', '1 Hour Speed-up', 'Reduces construction/training time by 1 hour', '{"effect":"speedup","duration":60}', 10, 0),
  ('item-speed-8h', 'SPEED_8H', 'consumable', 'uncommon', '8 Hour Speed-up', 'Reduces construction/training time by 8 hours', '{"effect":"speedup","duration":480}', 50, 0),
  ('item-boost-prod-24h', 'BOOST_PROD_24H', 'consumable', 'rare', 'Production Surge', '+20% Resource Production for 24h', '{"effect":"buff","type":"production","value":0.20,"duration":1440}', 100, 0),
  ('item-boost-peace-24h', 'BOOST_PEACE_24H', 'consumable', 'common', 'Peace Treaty', 'Shield city from attacks for 24h', '{"effect":"shield","duration":1440}', 80, 0),
  ('item-statue-king', 'STATUE_KING', 'collectible', 'legendary', 'Statue of the First King', 'Prestige decoration. +2% total production.', '{"effect":"passive","type":"production","value":0.02}', 500, 1),
  -- Phase 3 Collections
  ('item-founders-seal', 'FOUNDERS_SEAL', 'collectible', 'epic', 'Seal of the Founders', 'Mark of a council leader. +5% contribution efficiency.', '{"effect":"passive","type":"contribution","value":0.05}', 800, 1),
  ('item-imperial-crown', 'IMPERIAL_CROWN', 'collectible', 'legendary', 'Imperial Crown', 'Symbol of supreme power. +10% all stats.', '{"effect":"passive","type":"all","value":0.10}', 2000, 1);

-- Combat & Unit Stats (Phase 4)
INSERT OR REPLACE INTO troop_types (id, code, name, category, base_power, base_cost_coins, base_cost_resources_json, upkeep_coins, training_time_seconds, stats_json, created_at)
VALUES
  ('unit-militia', 'MILITIA', 'Militia', 'infantry', 5, 50, '{"FOOD":10}', 1, 30, '{"attack":5, "defense":5, "speed":2, "load":10, "type":"infantry"}', 1600000000000),
  ('unit-soldier', 'SOLDIER', 'Soldier', 'infantry', 12, 120, '{"FOOD":30, "RATIONS":10}', 3, 120, '{"attack":12, "defense":15, "speed":2, "load":15, "type":"infantry"}', 1600000000000),
  ('unit-archer', 'ARCHER', 'Archer', 'archer', 15, 150, '{"WOOD":20, "RATIONS":15}', 4, 150, '{"attack":20, "defense":5, "speed":3, "load":10, "type":"ranged"}', 1600000000000),
  ('unit-knight', 'KNIGHT', 'Knight', 'cavalry', 35, 400, '{"RATIONS":50, "STONE":10}', 10, 300, '{"attack":30, "defense":25, "speed":10, "load":40, "type":"cavalry"}', 1600000000000),
  ('unit-catapult', 'CATAPULT', 'Catapult', 'siege', 80, 1000, '{"WOOD":200, "STONE":100}', 25, 600, '{"attack":80, "defense":10, "speed":1, "load":0, "type":"siege"}', 1600000000000);

-- Initial Map Entities (PvE)
INSERT OR IGNORE INTO map_entities (id, type, level, region_id, defenders_json, rewards_json, status)
VALUES
  ('npc-bandit-1', 'BANDIT_CAMP', 1, 'region-1', '{"MILITIA":20, "ARCHER":5}', '{"resources":{"COINS":500, "FOOD":1000}}', 'active'),
  ('npc-bandit-2', 'BANDIT_CAMP', 2, 'region-1', '{"SOLDIER":20, "ARCHER":20}', '{"resources":{"COINS":1200, "RATIONS":200}}', 'active'),
  ('npc-ruins-1', 'ANCIENT_RUIN', 3, 'region-1', '{"KNIGHT":5, "SOLDIER":50}', '{"resources":{"COINS":5000, "GEMS":10}}', 'active');

-- Hospital & Casualty Config
INSERT OR REPLACE INTO sim_config_values (id, group_id, key, value_json)
VALUES
  ('cfg-combat-casualty', 'cfg-balance', 'casualty_ratios', json_object(
    'attacker_wounded_base', 0.25,
    'defender_wounded_base', 0.70,
    'min_death_ratio', 0.10,
    'max_wounded_ratio', 0.90
  ));

-- Premium Items (Hospital)
INSERT OR IGNORE INTO premium_items (id, code, type, rarity, title, description, payload_json, price_crowns, limited_run)
VALUES
  ('item-medboost-small', 'MEDBOOST_SMALL', 'consumable', 'common', 'Field Medics', '+10% Wounded Ratio for 24h', '{"effect":"buff","type":"wounded_ratio","value":0.10,"duration":1440}', 20, 0),
  ('item-medboost-large', 'MEDBOOST_LARGE', 'consumable', 'rare', 'Royal Surgeons', '+30% Wounded Ratio for 24h', '{"effect":"buff","type":"wounded_ratio","value":0.30,"duration":1440}', 50, 0);

-- Council Tech (Hospital)
INSERT OR IGNORE INTO council_tech_tree (id, code, name, description, tier, cost_json, prerequisites_json, buff_json)
VALUES
  ('tech-field-surgeons', 'FIELD_SURGEONS', 'Elite Field Surgeons', 'Attacker wounded ratio +10%', 2, '{"COINS":15000,"RATIONS":3000}', '["CONSCRIPTION"]', '{"combat":{"attackerWoundedRatio":0.10}}');


-- Phase 5: Combat Tuning
INSERT OR REPLACE INTO sim_config_values (id, group_id, key, value_json)
VALUES
  ('cfg-combat-thresholds', 'cfg-balance', 'combat_thresholds', json_object(
    'base_min_troops', 10,
    'mult_balanced', 1.0,
    'mult_militarist', 0.7,
    'mult_trader', 1.3,
    'militarist_training_mult', 1.5
  ));

-- Phase 5: Cosmetics & Banners
INSERT OR IGNORE INTO premium_items (id, code, type, rarity, title, description, payload_json, price_crowns, limited_run)
VALUES
  ('cosm-banner-gold', 'BANNER_GOLD', 'council_banner', 'rare', 'Golden Lion Banner', 'Prestige banner for wealthy councils.', '{"effect":"prestige_bonus","value":0.05}', 200, 0),
  ('cosm-banner-dragon', 'BANNER_DRAGON', 'council_banner', 'epic', 'Dragon Scale Banner', 'Intimidating banner. +2% War Score.', '{"effect":"war_score","value":0.02}', 500, 1),
  ('cosm-monument-fountain', 'MONUMENT_FOUNTAIN', 'city_monument', 'uncommon', 'Marble Fountain', 'Increases happiness by 1%', '{"effect":"happiness","value":0.01}', 100, 0),
  ('cosm-monument-statue', 'MONUMENT_WARRIOR', 'city_monument', 'rare', 'Warrior Statue', 'Increases max troops by 5%', '{"effect":"troop_cap","value":0.05}', 250, 0);

-- Phase 5: Council Events
INSERT OR IGNORE INTO event_definitions (id, code, type, name, description, scoring_config_json, rewards_json, scope)
VALUES
  ('evt-council-builder', 'COUNCIL_BUILDER', 'council_contribution', 'Council Builder Week', 'Contribute Stone to Council Projects', '{"metric":"contribution_resource","resource":"STONE"}', '{"rank_1":{"prestige":100, "crowns":1000}}', 'council');

