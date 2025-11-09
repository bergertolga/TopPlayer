export interface TroopType {
  id: string;
  code: string;
  name: string;
  category: string;
  basePower: number;
  baseCostCoins: number;
  baseCostResources: Record<string, number>;
  upkeepCoins: number;
  trainingTimeSeconds: number;
  maxLevel: number;
}

export interface CityTroop {
  id: string;
  cityId: string;
  troopTypeId: string;
  quantity: number;
  level: number;
  experience: number;
}

export interface ArmyFormation {
  id: string;
  cityId: string;
  name: string;
  troopQuantities: Record<string, number>;
  totalPower: number;
  isActive: boolean;
}

export class ArmyManager {
  static calculateTroopPower(
    basePower: number,
    quantity: number,
    level: number
  ): number {
    const levelMultiplier = 1 + (level - 1) * 0.1;
    return Math.floor(basePower * quantity * levelMultiplier);
  }

  static calculateFormationPower(
    troops: Array<{ basePower: number; quantity: number; level: number }>
  ): number {
    return troops.reduce((total, troop) => {
      return total + this.calculateTroopPower(troop.basePower, troop.quantity, troop.level);
    }, 0);
  }

  static calculateTrainingCost(
    baseCost: number,
    quantity: number,
    currentLevel: number
  ): { coins: number; resources: Record<string, number> } {
    const levelMultiplier = Math.pow(1.2, currentLevel - 1);
    return {
      coins: Math.floor(baseCost * quantity * levelMultiplier),
      resources: {}, // Will be populated from troop type
    };
  }
}

