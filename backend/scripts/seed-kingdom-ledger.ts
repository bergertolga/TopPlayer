// Seed script for Kingdom Ledger
// Run via: wrangler d1 execute idle-adventure-db --file=./scripts/seed-kingdom-ledger.sql

import resourcesData from '../src/config/resources.json';
import buildingsData from '../src/config/buildings.json';
import regionsData from '../src/config/regions.json';
import governorsData from '../src/config/governors.json';

const now = Date.now();

// Generate SQL for seeding resources
const seedResources = resourcesData.resources.map(r => {
  const id = `res-${r.code.toLowerCase()}`;
  return `INSERT OR IGNORE INTO resources (id, code, name, type, base_value, description, created_at) VALUES ('${id}', '${r.code}', '${r.name.replace(/'/g, "''")}', '${r.type}', ${r.baseValue}, '${(r.description || '').replace(/'/g, "''")}', ${now});`;
}).join('\n');

// Generate SQL for seeding buildings
const seedBuildings = buildingsData.buildings.map(b => {
  const id = `bld-${b.code.toLowerCase().replace(/_/g, '-')}`;
  const baseProduction = JSON.stringify(b.baseProduction || {});
  const inputResources = JSON.stringify(b.inputResources || {});
  const outputResources = JSON.stringify(b.outputResources || {});
  const upkeepResources = JSON.stringify(b.upkeepResources || {});
  
  return `INSERT OR IGNORE INTO buildings (id, code, name, category, base_production_json, input_resources_json, output_resources_json, upkeep_coins, upkeep_resources_json, workers_required, max_level, description, created_at) VALUES ('${id}', '${b.code}', '${b.name.replace(/'/g, "''")}', '${b.category}', '${baseProduction}', '${inputResources}', '${outputResources}', ${b.upkeepCoins}, '${upkeepResources}', ${b.workersRequired}, ${b.maxLevel}, '${(b.description || '').replace(/'/g, "''")}', ${now});`;
}).join('\n');

// Generate SQL for seeding regions
const seedRegions = regionsData.regions.map(r => {
  return `INSERT OR IGNORE INTO regions (id, name, tier, wood_bias, ore_bias, food_bias, stone_bias, fiber_bias, clay_bias, max_cities, created_at) VALUES ('${r.id}', '${r.name.replace(/'/g, "''")}', ${r.tier}, ${r.woodBias}, ${r.oreBias}, ${r.foodBias}, ${r.stoneBias}, ${r.fiberBias}, ${r.clayBias}, ${r.maxCities}, ${now});`;
}).join('\n');

// Generate SQL for seeding governors
const seedGovernors = governorsData.governors.map(g => {
  const id = `gov-${g.code.toLowerCase().replace(/_/g, '-')}`;
  const bonusJson = JSON.stringify(g.bonuses);
  
  return `INSERT OR IGNORE INTO governors (id, code, name, rarity, bonus_json, description, created_at) VALUES ('${id}', '${g.code}', '${g.name.replace(/'/g, "''")}', '${g.rarity}', '${bonusJson}', '${(g.description || '').replace(/'/g, "''")}', ${now});`;
}).join('\n');

// Generate SQL for initial PvE nodes
const seedPveNodes = [
  {
    id: 'pve-bandit-camp-1',
    regionId: 'region-heartlands',
    tier: 1,
    name: 'Bandit Camp',
    powerRequired: 100,
    reward: { COINS: 50, FOOD: 20, chance: 1.0 },
    respawnMinutes: 60
  },
  {
    id: 'pve-bandit-camp-2',
    regionId: 'region-highlands',
    tier: 1,
    name: 'Bandit Camp',
    powerRequired: 100,
    reward: { COINS: 50, ORE: 15, chance: 1.0 },
    respawnMinutes: 60
  },
  {
    id: 'pve-bandit-camp-3',
    regionId: 'region-coast',
    tier: 1,
    name: 'Bandit Camp',
    powerRequired: 100,
    reward: { COINS: 50, FIBER: 20, chance: 1.0 },
    respawnMinutes: 60
  }
].map(node => {
  const rewardJson = JSON.stringify(node.reward);
  const respawnAt = now + (node.respawnMinutes * 60 * 1000);
  
  return `INSERT OR IGNORE INTO pve_nodes (id, region_id, tier, name, power_required, reward_json, respawn_at, status, created_at) VALUES ('${node.id}', '${node.regionId}', ${node.tier}, '${node.name.replace(/'/g, "''")}', ${node.powerRequired}, '${rewardJson}', ${respawnAt}, 'active', ${now});`;
}).join('\n');

export const SEED_KINGDOM_LEDGER_SQL = `
-- Seed Resources
${seedResources}

-- Seed Buildings
${seedBuildings}

-- Seed Regions
${seedRegions}

-- Seed Governors
${seedGovernors}

-- Seed PvE Nodes
${seedPveNodes}
`;


