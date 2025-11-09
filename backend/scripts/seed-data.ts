// Seed data script for initial heroes, adventures, upgrades, etc.
// Run this after migrations to populate initial game data

export const SEED_HEROES = [
  {
    id: 'hero-001',
    name: 'Flame Knight',
    rarity: 'common',
    base_power: 100,
    upgrade_cost_base: 50,
    description: 'A brave warrior wielding the power of fire',
    element: 'fire',
  },
  {
    id: 'hero-002',
    name: 'Aqua Mage',
    rarity: 'common',
    base_power: 90,
    upgrade_cost_base: 50,
    description: 'A wise mage who commands water magic',
    element: 'water',
  },
  {
    id: 'hero-003',
    name: 'Earth Guardian',
    rarity: 'rare',
    base_power: 150,
    upgrade_cost_base: 100,
    description: 'A stalwart defender of the earth',
    element: 'earth',
  },
  {
    id: 'hero-004',
    name: 'Storm Archer',
    rarity: 'rare',
    base_power: 140,
    upgrade_cost_base: 100,
    description: 'A swift archer with wind at their command',
    element: 'air',
  },
  {
    id: 'hero-005',
    name: 'Shadow Assassin',
    rarity: 'epic',
    base_power: 250,
    upgrade_cost_base: 200,
    description: 'A deadly assassin moving through shadows',
    element: 'dark',
  },
  {
    id: 'hero-006',
    name: 'Light Paladin',
    rarity: 'epic',
    base_power: 240,
    upgrade_cost_base: 200,
    description: 'A holy warrior of pure light',
    element: 'light',
  },
  {
    id: 'hero-007',
    name: 'Dragon Lord',
    rarity: 'legendary',
    base_power: 500,
    upgrade_cost_base: 500,
    description: 'A legendary hero with dragon blood',
    element: 'fire',
  },
  {
    id: 'hero-008',
    name: 'Celestial Sage',
    rarity: 'legendary',
    base_power: 480,
    upgrade_cost_base: 500,
    description: 'A sage touched by celestial powers',
    element: 'light',
  },
];

export const SEED_ADVENTURES = [
  {
    id: 'adventure-001',
    stage_number: 1,
    name: 'The Beginning',
    description: 'Your first adventure begins here',
    enemy_power: 100,
    reward_coins: 100,
    reward_gems: 0,
    energy_cost: 1,
  },
  {
    id: 'adventure-002',
    stage_number: 2,
    name: 'Forest Path',
    description: 'Navigate through the mysterious forest',
    enemy_power: 200,
    reward_coins: 200,
    reward_gems: 1,
    energy_cost: 1,
  },
  {
    id: 'adventure-003',
    stage_number: 3,
    name: 'Mountain Pass',
    description: 'Climb the treacherous mountain path',
    enemy_power: 350,
    reward_coins: 350,
    reward_gems: 2,
    energy_cost: 2,
  },
  {
    id: 'adventure-004',
    stage_number: 4,
    name: 'Desert Oasis',
    description: 'Survive the scorching desert',
    enemy_power: 500,
    reward_coins: 500,
    reward_gems: 3,
    energy_cost: 2,
  },
  {
    id: 'adventure-005',
    stage_number: 5,
    name: 'Boss: Desert King',
    description: 'Face the ruler of the desert',
    enemy_power: 1000,
    reward_coins: 1500,
    reward_gems: 10,
    energy_cost: 3,
  },
];

export const SEED_UPGRADES = [
  {
    id: 'upgrade-001',
    name: 'Idle Speed Boost',
    type: 'global',
    cost_coins: 1000,
    cost_gems: null,
    effect_type: 'multiplier',
    effect_value: 1.5,
    max_level: 10,
    description: 'Increases idle coin generation by 50%',
  },
  {
    id: 'upgrade-002',
    name: 'Energy Capacity',
    type: 'global',
    cost_coins: null,
    cost_gems: 10,
    effect_type: 'add_value',
    effect_value: 20,
    max_level: 5,
    description: 'Increases maximum energy by 20',
  },
  {
    id: 'upgrade-003',
    name: 'Coin Multiplier',
    type: 'global',
    cost_coins: 5000,
    cost_gems: null,
    effect_type: 'multiplier',
    effect_value: 2.0,
    max_level: 5,
    description: 'Doubles all coin rewards',
  },
];

export const SEED_DAILY_REWARDS = [
  { day_number: 1, reward_type: 'coins', reward_value: 100 },
  { day_number: 2, reward_type: 'coins', reward_value: 200 },
  { day_number: 3, reward_type: 'gems', reward_value: 5 },
  { day_number: 4, reward_type: 'coins', reward_value: 500 },
  { day_number: 5, reward_type: 'gems', reward_value: 10 },
  { day_number: 6, reward_type: 'coins', reward_value: 1000 },
  { day_number: 7, reward_type: 'gems', reward_value: 25, reward_data: JSON.stringify({ special: true }) },
];

export async function seedDatabase(db: D1Database) {
  const now = Date.now();

  // Seed heroes
  for (const hero of SEED_HEROES) {
    await db.prepare(
      `INSERT INTO heroes (id, name, rarity, base_power, upgrade_cost_base, description, element, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(hero.id, hero.name, hero.rarity, hero.base_power, hero.upgrade_cost_base, hero.description, hero.element, now)
      .run();
  }

  // Seed adventures
  for (const adventure of SEED_ADVENTURES) {
    await db.prepare(
      `INSERT INTO adventures (id, stage_number, name, description, enemy_power, reward_coins, reward_gems, energy_cost, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        adventure.id,
        adventure.stage_number,
        adventure.name,
        adventure.description,
        adventure.enemy_power,
        adventure.reward_coins,
        adventure.reward_gems,
        adventure.energy_cost,
        now
      )
      .run();
  }

  // Seed upgrades
  for (const upgrade of SEED_UPGRADES) {
    await db.prepare(
      `INSERT INTO upgrades (id, name, type, cost_coins, cost_gems, effect_type, effect_value, max_level, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        upgrade.id,
        upgrade.name,
        upgrade.type,
        upgrade.cost_coins,
        upgrade.cost_gems,
        upgrade.effect_type,
        upgrade.effect_value,
        upgrade.max_level,
        upgrade.description,
        now
      )
      .run();
  }

  // Seed daily rewards
  for (const reward of SEED_DAILY_REWARDS) {
    await db.prepare(
      `INSERT INTO daily_rewards (id, day_number, reward_type, reward_value, reward_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        reward.day_number,
        reward.reward_type,
        reward.reward_value,
        reward.reward_data || null,
        now
      )
      .run();
  }
}


