import { IdleProgression } from './idle';

export interface HeroUpgradeResult {
  success: boolean;
  newLevel: number;
  newPower: number;
  cost: number;
  remainingCurrency: number;
}

export class HeroManager {
  private idleSystem: IdleProgression;

  constructor() {
    this.idleSystem = new IdleProgression();
  }

  calculateUpgradeCost(
    baseCost: number,
    currentLevel: number,
    scalingFactor: number = 1.15
  ): number {
    return this.idleSystem.calculateUpgradeCost(baseCost, currentLevel, scalingFactor);
  }

  calculateHeroPower(
    basePower: number,
    level: number,
    stars: number = 0,
    equipmentBonus: number = 0
  ): number {
    return this.idleSystem.calculateHeroPower(basePower, level, stars, equipmentBonus);
  }

  canUpgrade(
    currentCurrency: number,
    baseCost: number,
    currentLevel: number,
    cityLevel: number = 1
  ): { canUpgrade: boolean; cost: number } {
    const baseCostCalculated = this.calculateUpgradeCost(baseCost, currentLevel);
    const discount = Math.min(0.2, cityLevel * 0.01);
    const cost = Math.floor(baseCostCalculated * (1 - discount));
    return {
      canUpgrade: currentCurrency >= cost,
      cost,
    };
  }

  calculateExperienceNeeded(currentLevel: number): number {
    return Math.floor(100 * Math.pow(1.5, currentLevel - 1));
  }
}
