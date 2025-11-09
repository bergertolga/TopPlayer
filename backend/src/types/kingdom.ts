export interface Region {
  id: string;
  name: string;
  tier: number;
  wood_bias: number;
  ore_bias: number;
  food_bias: number;
  stone_bias: number;
  fiber_bias: number;
  clay_bias: number;
  event_tag?: string;
  max_cities: number;
  created_at: number;
}

export interface Resource {
  id: string;
  code: string;
  name: string;
  type: 'raw' | 'refined' | 'special' | 'fuel';
  base_value: number;
  description?: string;
  created_at: number;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  category: 'production' | 'processing' | 'city' | 'military' | 'logistics';
  base_production_json: string;
  input_resources_json: string;
  output_resources_json: string;
  upkeep_coins: number;
  upkeep_resources_json: string;
  workers_required: number;
  max_level: number;
  description?: string;
  created_at: number;
}

export interface City {
  id: string;
  user_id: string;
  region_id: string;
  name: string;
  level: number;
  population: number;
  happiness: number;
  prestige_count: number;
  shield_until: number;
  last_tick: number;
  created_at: number;
}

export interface CityResource {
  city_id: string;
  resource_id: string;
  amount: number;
  protected: number;
}

export interface CityBuilding {
  city_id: string;
  building_id: string;
  level: number;
  workers: number;
  fuel_resource_id?: string;
  is_active: number;
  last_production: number;
}

export interface Governor {
  id: string;
  code: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  bonus_json: string;
  description?: string;
  created_at: number;
}

export interface CityGovernor {
  city_id: string;
  governor_id: string;
  slot: 'city' | 'building';
  assigned_building_id?: string;
}

export interface MarketOrder {
  id: string;
  city_id: string;
  resource_id: string;
  side: 'buy' | 'sell';
  price: number;
  qty: number;
  qty_filled: number;
  status: 'open' | 'filled' | 'cancelled' | 'expired';
  created_at: number;
  expires_at?: number;
  last_match_at?: number;
}

export interface Trade {
  id: string;
  buy_order_id: string;
  sell_order_id: string;
  city_id_buyer: string;
  city_id_seller: string;
  resource_id: string;
  price: number;
  qty: number;
  fee: number;
  tax: number;
  traded_at: number;
}

export interface Route {
  id: string;
  city_id: string;
  from_region_id: string;
  to_region_id: string;
  capacity: number;
  resource_id: string;
  qty_per_trip: number;
  cycle_minutes: number;
  escort_level: number;
  repeats: number;
  next_departure: number;
  status: 'active' | 'paused' | 'completed';
  created_at: number;
}

export interface Council {
  id: string;
  name: string;
  steward_user_id: string;
  region_id: string;
  tax_rate: number;
  created_at: number;
}

export interface CouncilMember {
  council_id: string;
  user_id: string;
  role: 'steward' | 'officer' | 'member';
  joined_at: number;
}

export interface PublicWork {
  id: string;
  council_id: string;
  project_code: string;
  name: string;
  description?: string;
  required_resources_json: string;
  contributed_resources_json: string;
  completion_percentage: number;
  region_bonus_json?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: number;
  completed_at?: number;
}

export interface PveNode {
  id: string;
  region_id: string;
  tier: number;
  name: string;
  power_required: number;
  reward_json: string;
  respawn_at: number;
  status: 'active' | 'defeated' | 'respawning';
  created_at: number;
}


