export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
  MARKET: DurableObjectNamespace;
  REALM: DurableObjectNamespace;
  KINGDOM: DurableObjectNamespace;
  CITY: DurableObjectNamespace;
  RULESETS?: KVNamespace; // For ruleset storage
  TEST_CLOCK?: {
    now(): number;
  };
  TEST_RNG?: {
    next(): number;
    nextInt?(max: number): number;
  };
}

export interface User {
  id: string;
  username: string;
  email?: string;
  created_at: number;
  last_active: number;
  total_spent: number;
  prestige_count: number;
  server_region: string;
}

export interface Hero {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  base_power: number;
  upgrade_cost_base: number;
  unlock_requirement?: string;
  description?: string;
  element?: string;
  created_at: number;
}

export interface UserHero {
  id: string;
  user_id: string;
  hero_id: string;
  level: number;
  stars: number;
  experience: number;
  equipped_weapon_id?: string;
  equipped_armor_id?: string;
  equipped_accessory_id?: string;
  created_at: number;
}

export interface Adventure {
  id: string;
  stage_number: number;
  name: string;
  description?: string;
  enemy_power: number;
  reward_coins: number;
  reward_gems: number;
  reward_hero_shards?: string;
  energy_cost: number;
  created_at: number;
}

export interface UserProgress {
  user_id: string;
  total_currency: number;
  premium_currency: number;
  energy: number;
  max_energy: number;
  current_adventure_stage: number;
  last_offline_calculation?: number;
  data?: string; 
  updated_at: number;
}

export interface Purchase {
  id: string;
  user_id: string;
  product_id: string;
  transaction_id: string;
  receipt_data?: string;
  amount: number;
  currency: string;
  verified: boolean;
  created_at: number;
}

