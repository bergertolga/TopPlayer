// Script to seed the database with initial game data
import { seedDatabase, SEED_HEROES, SEED_ADVENTURES, SEED_UPGRADES, SEED_DAILY_REWARDS } from './seed-data';

// This would be run via wrangler d1 execute
// For now, we'll create SQL statements that can be executed

export const SEED_SQL = `
-- Seed Heroes
${SEED_HEROES.map(hero => `
INSERT OR IGNORE INTO heroes (id, name, rarity, base_power, upgrade_cost_base, description, element, created_at)
VALUES ('${hero.id}', '${hero.name.replace(/'/g, "''")}', '${hero.rarity}', ${hero.base_power}, ${hero.upgrade_cost_base}, '${hero.description?.replace(/'/g, "''") || ''}', '${hero.element || ''}', ${Date.now()});
`).join('\n')}

-- Seed Adventures
${SEED_ADVENTURES.map(adventure => `
INSERT OR IGNORE INTO adventures (id, stage_number, name, description, enemy_power, reward_coins, reward_gems, energy_cost, created_at)
VALUES ('${adventure.id}', ${adventure.stage_number}, '${adventure.name.replace(/'/g, "''")}', '${adventure.description?.replace(/'/g, "''") || ''}', ${adventure.enemy_power}, ${adventure.reward_coins}, ${adventure.reward_gems}, ${adventure.energy_cost}, ${Date.now()});
`).join('\n')}

-- Seed Upgrades
${SEED_UPGRADES.map(upgrade => `
INSERT OR IGNORE INTO upgrades (id, name, type, cost_coins, cost_gems, effect_type, effect_value, max_level, description, created_at)
VALUES ('${upgrade.id}', '${upgrade.name.replace(/'/g, "''")}', '${upgrade.type}', ${upgrade.cost_coins || 'NULL'}, ${upgrade.cost_gems || 'NULL'}, '${upgrade.effect_type}', ${upgrade.effect_value}, ${upgrade.max_level}, '${upgrade.description.replace(/'/g, "''")}', ${Date.now()});
`).join('\n')}

-- Seed Daily Rewards
${SEED_DAILY_REWARDS.map((reward, index) => `
INSERT OR IGNORE INTO daily_rewards (id, day_number, reward_type, reward_value, reward_data, created_at)
VALUES ('${crypto.randomUUID()}', ${reward.day_number}, '${reward.reward_type}', ${reward.reward_value}, ${reward.reward_data ? `'${reward.reward_data}'` : 'NULL'}, ${Date.now()});
`).join('\n')}
`;


