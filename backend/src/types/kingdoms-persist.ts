/**
 * Kingdoms Persist - Core Type Definitions
 * Based on the project brief for persistent, server-authoritative strategy game
 */

// ============================================================================
// Core State Types
// ============================================================================

export interface CityState {
  ticks: number;
  resources: Record<string, number>;
  labor: {
    free: number;
    assigned: Record<string, number>;
  };
  buildings: Array<{
    id: string;
    lvl: number;
    slot?: number;
  }>;
  laws: {
    tax: number;
    market_fee: number;
    rationing: 'normal' | 'strict' | 'abundant';
  };
  units: Record<string, number>;
  heroes: Array<{
    id: string;
    cmd: number;
    crf: number;
    cng: number;
    traits: string[];
  }>;
  queues: {
    build: Array<BuildQueueEntry>;
    train: Array<TrainQueueEntry>;
  };
  version: number;
  seed: number; // For deterministic RNG
}

// ============================================================================
// Command Types
// ============================================================================

export type CommandType = 'BUILD' | 'TRAIN' | 'LAW_SET' | 'ORDER_PLACE' | 'ORDER_CANCEL' | 'EXPEDITION_START';

export interface BaseCommand {
  type: CommandType;
  client_time: number;
  id?: string; // Generated server-side
}

export interface BuildCommand extends BaseCommand {
  type: 'BUILD';
  building: string;
  slot: number;
}

export interface TrainCommand extends BaseCommand {
  type: 'TRAIN';
  unit: string;
  qty: number;
}

export interface BuildQueueEntry extends BuildCommand {
  started_at_tick: number;
  ready_at_tick: number;
}

export interface TrainQueueEntry extends TrainCommand {
  started_at_tick: number;
  ready_at_tick: number;
}

export interface LawSetCommand extends BaseCommand {
  type: 'LAW_SET';
  tax?: number;
  market_fee?: number;
  rationing?: 'normal' | 'strict' | 'abundant';
}

export interface OrderPlaceCommand extends BaseCommand {
  type: 'ORDER_PLACE';
  side: 'buy' | 'sell';
  item: string;
  qty: number;
  price: number;
}

export interface OrderCancelCommand extends BaseCommand {
  type: 'ORDER_CANCEL';
  order_id: string;
}

export interface ExpeditionStartCommand extends BaseCommand {
  type: 'EXPEDITION_START';
  hero_ids: string[];
  destination: string;
  duration_ticks: number;
}

export type Command = BuildCommand | TrainCommand | LawSetCommand | OrderPlaceCommand | OrderCancelCommand | ExpeditionStartCommand;

// ============================================================================
// Realm State
// ============================================================================

export interface RealmState {
  tick: number;
  iso_time: string;
  ruleset_id: string;
  kingdoms: string[]; // Kingdom IDs
}

// ============================================================================
// Kingdom State
// ============================================================================

export interface KingdomState {
  id: string;
  realm_id: string;
  region_seeds: Record<string, number>;
  cities: string[]; // City IDs
  created_at: number;
}

// ============================================================================
// Market Types
// ============================================================================

export interface MarketOrder {
  id: string;
  kingdom_id: string;
  city_id: string;
  item: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  status: 'open' | 'filled' | 'cancelled';
  created_at: number;
  filled_qty?: number;
}

export interface Trade {
  id: string;
  order_buy: string;
  order_sell: string;
  item: string;
  qty: number;
  price: number;
  ts: number;
}

export interface OrderBook {
  bids: Array<{ price: number; qty: number }>;
  asks: Array<{ price: number; qty: number }>;
}

// ============================================================================
// Hero Types
// ============================================================================

export interface Hero {
  id: string;
  city_id: string;
  def_json: {
    name: string;
    traits: string[];
  };
  cmd: number; // Command stat
  crf: number; // Craft stat
  cng: number; // Cunning stat
  xp: number;
  status: 'idle' | 'expedition' | 'garrison';
  expedition_returns_at?: number;
}

// ============================================================================
// Event Types
// ============================================================================

export interface GameEvent {
  id: string;
  kingdom_id: string;
  type: 'climate' | 'plague' | 'fair' | 'market_crash' | 'harvest';
  payload_json: Record<string, any>;
  ts: number;
}

// ============================================================================
// Ruleset Types
// ============================================================================

export interface Ruleset {
  id: string;
  version: string;
  units: Record<string, UnitDef>;
  buildings: Record<string, BuildingDef>;
  recipes: Record<string, RecipeDef>;
  events: Record<string, EventDef>;
}

export interface UnitDef {
  name: string;
  family: 'levy' | 'professional' | 'specialist';
  cost: Record<string, number>;
  upkeep: Record<string, number>;
  train_time_ticks: number;
}

export interface BuildingDef {
  name: string;
  type: 'production' | 'processing' | 'military' | 'storage' | 'city';
  cost: Record<string, number>;
  upkeep: Record<string, number>;
  build_time_ticks: number;
  production?: Record<string, number>;
  storage?: number;
  processing?: {
    input: Record<string, number>;
    output: Record<string, number>;
    efficiency: number;
  };
}

export interface RecipeDef {
  name: string;
  input: Record<string, number>;
  output: Record<string, number>;
  time_ticks: number;
  building: string;
}

export interface EventDef {
  name: string;
  type: string;
  modifiers: Record<string, number>;
  duration_ticks: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface RealmTimeResponse {
  tick: number;
  iso_time: string;
}

export interface CityStateResponse {
  state: CityState;
  version: number;
}

export interface CommandResponse {
  accepted: boolean;
  command_id?: string;
  error?: string;
}

export interface OrderBookResponse {
  bids: Array<{ price: number; qty: number }>;
  asks: Array<{ price: number; qty: number }>;
}

