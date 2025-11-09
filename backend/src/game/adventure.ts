export interface BattleResult {
  victory: boolean;
  stars: number;
  time: number;
  rewards: {
    coins: number;
    gems: number;
    resources?: Record<string, number>;
    heroShards?: { heroId: string; amount: number }[];
  };
}

export interface BattleTeam {
  heroIds: string[];
  totalPower: number;
}

export class AdventureBattle {
  calculateBattleResult(
    teamPower: number,
    enemyPower: number,
    stageNumber: number
  ): BattleResult {
    const powerRatio = teamPower / enemyPower;
    
    const victory = powerRatio >= 0.7;
    
    if (!victory) {
      return {
        victory: false,
        stars: 0,
        time: 0,
        rewards: { coins: 0, gems: 0 },
      };
    }

    let stars = 1;
    if (powerRatio >= 1.5) stars = 3;
    else if (powerRatio >= 1.0) stars = 2;

    const baseTime = 30;
    const time = Math.max(10, baseTime / powerRatio);

    const baseCoins = 100 * stageNumber;
    const coins = Math.floor(baseCoins * (1 + stars * 0.5));
    const gems = stars >= 3 ? Math.floor(stageNumber * 0.1) : 0;

    const resources: Record<string, number> = {
      WOOD: Math.floor(stageNumber * 10 * (1 + stars * 0.3)),
      STONE: Math.floor(stageNumber * 8 * (1 + stars * 0.3)),
      FOOD: Math.floor(stageNumber * 15 * (1 + stars * 0.3)),
    };

    const heroShards: { heroId: string; amount: number }[] = [];
    if (Math.random() < 0.3 * stars) {
      heroShards.push({
        heroId: 'random',
        amount: stars,
      });
    }

    return {
      victory: true,
      stars,
      time: Math.floor(time),
      rewards: {
        coins,
        gems,
        resources,
        heroShards: heroShards.length > 0 ? heroShards : undefined,
      },
    };
  }

  calculateTeamPower(
    heroPowers: number[],
    equipmentBonuses: number[] = []
  ): number {
    let totalPower = heroPowers.reduce((sum, power) => sum + power, 0);
    totalPower += equipmentBonuses.reduce((sum, bonus) => sum + bonus, 0);
    return Math.floor(totalPower);
  }
}
