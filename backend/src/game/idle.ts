export interface OfflineEarnings {
  coins: number;
  gems: number;
  experience: number;
  timeOffline: number;
}

export interface IdleConfig {
  baseGenerationRate: number;
  gemGenerationChance: number;
  offlineMaxHours: number;
}

export class IdleProgression {
  private config: IdleConfig;

  constructor(config: IdleConfig = {
    baseGenerationRate: 1,
    gemGenerationChance: 0.01,
    offlineMaxHours: 24,
  }) {
    this.config = config;
  }

  calculateOfflineEarnings(
    timeOfflineSeconds: number,
    heroLevels: number[],
    multipliers: number = 1.0
  ): OfflineEarnings {
    const maxSeconds = this.config.offlineMaxHours * 3600;
    const effectiveSeconds = Math.min(timeOfflineSeconds, maxSeconds);

    let totalCoins = 0;
    for (const level of heroLevels) {
      const heroPower = 1 + (level - 1) * 0.1;
      const coinsPerSecond = this.config.baseGenerationRate * heroPower;
      totalCoins += coinsPerSecond * effectiveSeconds;
    }

    totalCoins = Math.floor(totalCoins * multipliers);

    const minutesOffline = Math.floor(effectiveSeconds / 60);
    const gems = Math.floor(minutesOffline * this.config.gemGenerationChance * Math.random());

    const experience = Math.floor(totalCoins * 0.1);

    return {
      coins: Math.floor(totalCoins),
      gems,
      experience,
      timeOffline: effectiveSeconds,
    };
  }

  calculateUpgradeCost(baseCost: number, currentLevel: number, scalingFactor: number = 1.15): number {
    return Math.floor(baseCost * Math.pow(scalingFactor, currentLevel - 1));
  }

  calculateHeroPower(basePower: number, level: number, stars: number = 0, equipmentBonus: number = 0): number {
    const levelMultiplier = 1 + (level - 1) * 0.1;
    const starMultiplier = 1 + stars * 0.2;
    return Math.floor(basePower * levelMultiplier * starMultiplier + equipmentBonus);
  }

  calculatePrestigeMultiplier(prestigeCount: number): number {
    return 1 + (prestigeCount * 0.01) / (1 + prestigeCount * 0.001);
  }
}
