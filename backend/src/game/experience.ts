import { HeroManager } from './heroes';

export interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  newPower: number;
  rewards?: {
    coins?: number;
    gems?: number;
  };
}

export class ExperienceSystem {
  private heroManager: HeroManager;

  constructor() {
    this.heroManager = new HeroManager();
  }

  async applyExperience(
    db: D1Database,
    userHeroId: string,
    experience: number
  ): Promise<LevelUpResult> {
    const userHero = await db.prepare(
      'SELECT uh.*, h.base_power FROM user_heroes uh JOIN heroes h ON uh.hero_id = h.id WHERE uh.id = ?'
    )
      .bind(userHeroId)
      .first<{ level: number; experience: number; base_power: number }>();

    if (!userHero) {
      return { leveledUp: false, newLevel: 0, newPower: 0 };
    }

    let newExperience = userHero.experience + experience;
    let newLevel = userHero.level;
    let leveledUp = false;
    const rewards: { coins?: number; gems?: number } = {};

    while (true) {
      const expNeeded = this.calculateExperienceNeeded(newLevel);
      if (newExperience >= expNeeded) {
        newExperience -= expNeeded;
        newLevel++;
        leveledUp = true;
        
        if (newLevel % 5 === 0) {
          rewards.gems = (rewards.gems || 0) + 1;
        } else {
          rewards.coins = (rewards.coins || 0) + 50 * newLevel;
        }
      } else {
        break;
      }
    }

    await db.prepare(
      'UPDATE user_heroes SET level = ?, experience = ? WHERE id = ?'
    )
      .bind(newLevel, newExperience, userHeroId)
      .run();

    if (leveledUp && (rewards.coins || rewards.gems)) {
      const userHeroFull = await db.prepare(
        'SELECT user_id FROM user_heroes WHERE id = ?'
      )
        .bind(userHeroId)
        .first<{ user_id: string }>();

      if (userHeroFull) {
        if (rewards.gems) {
          await db.prepare(
            'UPDATE user_progress SET premium_currency = premium_currency + ? WHERE user_id = ?'
          )
            .bind(rewards.gems, userHeroFull.user_id)
            .run();
        }

        if (rewards.coins) {
          const city = await db.prepare(
            'SELECT id FROM cities WHERE user_id = ?'
          )
            .bind(userHeroFull.user_id)
            .first<{ id: string }>();

          if (city) {
            const coinsResource = await db.prepare(
              'SELECT id FROM resources WHERE code = ?'
            )
              .bind('COINS')
              .first<{ id: string }>();

            if (coinsResource) {
              const currentCoins = await db.prepare(
                'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
              ).bind(city.id, coinsResource.id).first<{ amount: number }>();
              
              const currentAmount = Math.max(0, currentCoins?.amount || 0);
              const newAmount = Math.max(0, currentAmount + rewards.coins);
              
              await db.prepare(
                `INSERT INTO city_resources (city_id, resource_id, amount, protected)
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
              )
                .bind(city.id, coinsResource.id, newAmount, 0, newAmount)
                .run();
            }
          }
        }
      }
    }

    const newPower = this.heroManager.calculateHeroPower(
      userHero.base_power,
      newLevel
    );

    return {
      leveledUp,
      newLevel,
      newPower,
      rewards: leveledUp ? rewards : undefined,
    };
  }

  calculateExperienceNeeded(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  async distributeExperience(
    db: D1Database,
    userId: string,
    totalExperience: number
  ): Promise<LevelUpResult[]> {
    const userHeroes = await db.prepare(
      'SELECT id FROM user_heroes WHERE user_id = ?'
    )
      .bind(userId)
      .all();

    if (userHeroes.results.length === 0) {
      return [];
    }

    const expPerHero = Math.floor(totalExperience / userHeroes.results.length);
    const results: LevelUpResult[] = [];

    for (const hero of userHeroes.results as any[]) {
      const result = await this.applyExperience(db, hero.id, expPerHero);
      results.push(result);
    }

    return results;
  }
}
