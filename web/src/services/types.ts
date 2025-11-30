
export interface ResourceMap {
  [key: string]: number;
}

export interface Building {
  type: string;
  level: number;
  upgradeCost?: number;
  canUpgrade?: boolean;
}

export interface Troop {
  typeId?: string;
  type: string;
  count: number;
}

export interface HospitalState {
  capacity: number;
  occupied: number;
  woundedByType: Troop[];
}

export interface CitySummary {
  id: string;
  name: string;
  level: number;
  region_id?: string;
  resources: ResourceMap;
  buildings: Building[];
  troops: Troop[];
  hospital: HospitalState;
}

export interface CouncilSummary {
  id: string;
  name: string;
  prestige: number;
  focus: string | null;
  membersCount: number;
  badgeId: string | null;
  role: string;
}

export interface GameEvent {
  id: string;
  name: string;
  type: string;
  end_at: number;
  scope: 'city' | 'council' | 'kingdom';
}

export interface PremiumWallet {
  gems: number;
  crowns: number;
  favor: number;
}

export interface Cosmetic {
  code: string;
  type: string;
}

export interface ClientOverview {
  city: CitySummary;
  council: CouncilSummary | null;
  events: {
    active: GameEvent[];
  };
  premium: {
    wallet: PremiumWallet;
    ownedCosmetics: Cosmetic[];
  };
}

export interface TechNode {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: number;
  status: 'locked' | 'unlocked' | 'active' | 'completed';
  progress: number;
  current_contributions: ResourceMap;
  cost_json: string; // serialized JSON
}

export interface CombatEntity {
  id: string;
  type: string;
  level: number;
  status: string;
  defenders_json: string;
  rewards_json: string;
}

export interface BattleLog {
  id: string;
  attacker_id: string;
  winner_id: string | null;
  battle_type: string;
  started_at: number;
  details_json: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
  };
  userId?: string; // register response format might differ slightly
}

