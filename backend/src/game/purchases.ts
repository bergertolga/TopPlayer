export interface ProductReward {
  coins?: number;
  gems?: number;
  energy?: number;
  heroId?: string;
  multiplier?: number;
  multiplierDuration?: number;
}

export const PRODUCT_REWARDS: Record<string, ProductReward> = {
  'com.idleadventure.gems_small': { gems: 50 },
  'com.idleadventure.gems_medium': { gems: 200 },
  'com.idleadventure.gems_large': { gems: 500 },
  'com.idleadventure.gems_epic': { gems: 1500 },
  'com.idleadventure.coins_small': { coins: 1000 },
  'com.idleadventure.coins_medium': { coins: 5000 },
  'com.idleadventure.coins_large': { coins: 25000 },
  
  'com.idleadventure.hero_pack_1': { heroId: 'hero-003' },
  'com.idleadventure.hero_pack_2': { heroId: 'hero-005' },
  
  'com.idleadventure.energy_refill': { energy: 100 },
  'com.idleadventure.boost_2x': { multiplier: 2.0, multiplierDuration: 3600 },
  'com.idleadventure.boost_5x': { multiplier: 5.0, multiplierDuration: 1800 },
};

export class PurchaseRewards {
  static async grantRewards(
    db: D1Database,
    userId: string,
    productId: string
  ): Promise<{ success: boolean; rewards: ProductReward }> {
    const reward = PRODUCT_REWARDS[productId];
    
    if (!reward) {
      return { success: false, rewards: {} };
    }

    const city = await db.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (reward.coins && city) {
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
        const newAmount = Math.max(0, currentAmount + reward.coins);
        
        await db.prepare(
          `INSERT INTO city_resources (city_id, resource_id, amount, protected)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
        )
          .bind(city.id, coinsResource.id, newAmount, 0, newAmount)
          .run();
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (reward.gems) {
      updates.push('premium_currency = premium_currency + ?');
      values.push(reward.gems);
    }

    if (reward.energy) {
      updates.push('energy = LEAST(energy + ?, max_energy)');
      values.push(reward.energy);
    }

    if (updates.length > 0) {
      values.push(userId);
      await db.prepare(
        `UPDATE user_progress SET ${updates.join(', ')} WHERE user_id = ?`
      )
        .bind(...values)
        .run();
    }

    if (reward.heroId) {
      const existingHero = await db.prepare(
        'SELECT id FROM user_heroes WHERE user_id = ? AND hero_id = ?'
      )
        .bind(userId, reward.heroId)
        .first<{ id: string }>();

      if (!existingHero) {
        const heroId = crypto.randomUUID();
        await db.prepare(
          'INSERT INTO user_heroes (id, user_id, hero_id, level, stars, experience, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(heroId, userId, reward.heroId, 1, 0, 0, Date.now())
          .run();
      }
    }

    if (reward.multiplier) {
      const boostId = crypto.randomUUID();
      const expiresAt = Date.now() + (reward.multiplierDuration || 0) * 1000;
      
      const progress = await db.prepare(
        'SELECT data FROM user_progress WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ data: string | null }>();

      const data = progress?.data ? JSON.parse(progress.data) : {};
      data.activeBoosts = data.activeBoosts || [];
      data.activeBoosts.push({
        id: boostId,
        multiplier: reward.multiplier,
        expiresAt,
      });

      await db.prepare(
        'UPDATE user_progress SET data = ? WHERE user_id = ?'
      )
        .bind(JSON.stringify(data), userId)
        .run();
    }

    return { success: true, rewards: reward };
  }
}
