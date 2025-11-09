-- Seed data for idle-adventure game
-- Run with: wrangler d1 execute idle-adventure-db --remote --file=scripts/seed.sql

-- Seed Heroes
INSERT OR IGNORE INTO heroes (id, name, rarity, base_power, upgrade_cost_base, description, element, created_at) VALUES
('hero-001', 'Flame Knight', 'common', 100, 50, 'A brave warrior wielding the power of fire', 'fire', 1720188000000),
('hero-002', 'Aqua Mage', 'common', 90, 50, 'A wise mage who commands water magic', 'water', 1720188000000),
('hero-003', 'Earth Guardian', 'rare', 150, 100, 'A stalwart defender of the earth', 'earth', 1720188000000),
('hero-004', 'Storm Archer', 'rare', 140, 100, 'A swift archer with wind at their command', 'air', 1720188000000),
('hero-005', 'Shadow Assassin', 'epic', 250, 200, 'A deadly assassin moving through shadows', 'dark', 1720188000000),
('hero-006', 'Light Paladin', 'epic', 240, 200, 'A holy warrior of pure light', 'light', 1720188000000),
('hero-007', 'Dragon Lord', 'legendary', 500, 500, 'A legendary hero with dragon blood', 'fire', 1720188000000),
('hero-008', 'Celestial Sage', 'legendary', 480, 500, 'A sage touched by celestial powers', 'light', 1720188000000);

-- Seed Adventures
INSERT OR IGNORE INTO adventures (id, stage_number, name, description, enemy_power, reward_coins, reward_gems, energy_cost, created_at) VALUES
('adventure-001', 1, 'The Beginning', 'Your first adventure begins here', 100, 100, 0, 1, 1720188000000),
('adventure-002', 2, 'Forest Path', 'Navigate through the mysterious forest', 200, 200, 1, 1, 1720188000000),
('adventure-003', 3, 'Mountain Pass', 'Climb the treacherous mountain path', 350, 350, 2, 2, 1720188000000),
('adventure-004', 4, 'Desert Oasis', 'Survive the scorching desert', 500, 500, 3, 2, 1720188000000),
('adventure-005', 5, 'Boss: Desert King', 'Face the ruler of the desert', 1000, 1500, 10, 3, 1720188000000);

-- Seed Upgrades
INSERT OR IGNORE INTO upgrades (id, name, type, cost_coins, cost_gems, effect_type, effect_value, max_level, description, created_at) VALUES
('upgrade-001', 'Idle Speed Boost', 'global', 1000, NULL, 'multiplier', 1.5, 10, 'Increases idle coin generation by 50%', 1720188000000),
('upgrade-002', 'Energy Capacity', 'global', NULL, 10, 'add_value', 20, 5, 'Increases maximum energy by 20', 1720188000000),
('upgrade-003', 'Coin Multiplier', 'global', 5000, NULL, 'multiplier', 2.0, 5, 'Doubles all coin rewards', 1720188000000);

-- Seed Daily Rewards
INSERT OR IGNORE INTO daily_rewards (id, day_number, reward_type, reward_value, reward_data, created_at) VALUES
('reward-001', 1, 'coins', 100, NULL, 1720188000000),
('reward-002', 2, 'coins', 200, NULL, 1720188000000),
('reward-003', 3, 'gems', 5, NULL, 1720188000000),
('reward-004', 4, 'coins', 500, NULL, 1720188000000),
('reward-005', 5, 'gems', 10, NULL, 1720188000000),
('reward-006', 6, 'coins', 1000, NULL, 1720188000000),
('reward-007', 7, 'gems', 25, '{"special": true}', 1720188000000);


