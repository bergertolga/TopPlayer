export interface MilestoneReward {
  coins?: number;
  gems?: number;
  resources?: Record<string, number>;
}

export interface MilestoneDefinition {
  type: string;
  checkValue: (value: number) => boolean;
  getReward: (value: number) => MilestoneReward;
}

const MILESTONE_DEFINITIONS: Record<string, MilestoneDefinition> = {
  city_level_5: {
    type: 'city_level_5',
    checkValue: (level) => level >= 5,
    getReward: () => ({ coins: 500, gems: 10 }),
  },
  city_level_10: {
    type: 'city_level_10',
    checkValue: (level) => level >= 10,
    getReward: () => ({ coins: 2000, gems: 25 }),
  },
  city_level_15: {
    type: 'city_level_15',
    checkValue: (level) => level >= 15,
    getReward: () => ({ coins: 5000, gems: 50 }),
  },
  hero_level_10: {
    type: 'hero_level_10',
    checkValue: (level) => level >= 10,
    getReward: () => ({ coins: 300, gems: 5 }),
  },
  hero_level_20: {
    type: 'hero_level_20',
    checkValue: (level) => level >= 20,
    getReward: () => ({ coins: 1000, gems: 15 }),
  },
  first_market_trade: {
    type: 'first_market_trade',
    checkValue: () => true,
    getReward: () => ({ coins: 200, gems: 3 }),
  },
  first_route: {
    type: 'first_route',
    checkValue: () => true,
    getReward: () => ({ coins: 150, gems: 2 }),
  },
  warehouse_level_5: {
    type: 'warehouse_level_5',
    checkValue: (level) => level >= 5,
    getReward: () => ({ coins: 400, gems: 8 }),
  },
  warehouse_level_10: {
    type: 'warehouse_level_10',
    checkValue: (level) => level >= 10,
    getReward: () => ({ coins: 1500, gems: 20 }),
  },
};

export class MilestoneSystem {
  static async checkAndGrantMilestone(
    db: D1Database,
    userId: string,
    milestoneType: string,
    currentValue: number
  ): Promise<{ achieved: boolean; reward?: MilestoneReward }> {
    const definition = MILESTONE_DEFINITIONS[milestoneType];
    if (!definition) {
      return { achieved: false };
    }

    const existing = await db.prepare(
      'SELECT id FROM milestones WHERE user_id = ? AND milestone_type = ?'
    )
      .bind(userId, milestoneType)
      .first<{ id: string }>();

    if (existing) {
      return { achieved: false };
    }

    if (!definition.checkValue(currentValue)) {
      return { achieved: false };
    }

    const reward = definition.getReward(currentValue);
    const milestoneId = crypto.randomUUID();
    const now = Date.now();

    await db.prepare(
      `INSERT INTO milestones (id, user_id, milestone_type, milestone_value, achieved_at, reward_coins, reward_gems, reward_resources_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        milestoneId,
        userId,
        milestoneType,
        currentValue,
        now,
        reward.coins || 0,
        reward.gems || 0,
        reward.resources ? JSON.stringify(reward.resources) : null
      )
      .run();

    return { achieved: true, reward };
  }

  static async getUserMilestones(
    db: D1Database,
    userId: string
  ): Promise<any[]> {
    const milestones = await db.prepare(
      'SELECT * FROM milestones WHERE user_id = ? ORDER BY achieved_at DESC'
    )
      .bind(userId)
      .all();

    return milestones.results.map((m: any) => ({
      ...m,
      reward_resources: m.reward_resources_json ? JSON.parse(m.reward_resources_json) : null,
    }));
  }

  static async claimMilestoneReward(
    db: D1Database,
    userId: string,
    milestoneId: string
  ): Promise<{ success: boolean; error?: string }> {
    const milestone = await db.prepare(
      'SELECT * FROM milestones WHERE id = ? AND user_id = ?'
    )
      .bind(milestoneId, userId)
      .first<{
        claimed_at: number | null;
        reward_coins: number;
        reward_gems: number;
        reward_resources_json: string | null;
      }>();

    if (!milestone) {
      return { success: false, error: 'Milestone not found' };
    }

    if (milestone.claimed_at) {
      return { success: false, error: 'Reward already claimed' };
    }

    const city = await db.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return { success: false, error: 'City not found' };
    }

    const now = Date.now();

    if (milestone.reward_coins > 0) {
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
        const newAmount = Math.max(0, currentAmount + milestone.reward_coins);
        
        await db.prepare(
          `INSERT INTO city_resources (city_id, resource_id, amount, protected)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
        )
          .bind(city.id, coinsResource.id, newAmount, 0, newAmount)
          .run();
      }
    }

    if (milestone.reward_gems > 0) {
      await db.prepare(
        'UPDATE user_progress SET premium_currency = premium_currency + ? WHERE user_id = ?'
      )
        .bind(milestone.reward_gems, userId)
        .run();
    }

    if (milestone.reward_resources_json) {
      const resources = JSON.parse(milestone.reward_resources_json);
      for (const [resourceCode, amount] of Object.entries(resources)) {
        const resource = await db.prepare(
          'SELECT id FROM resources WHERE code = ?'
        )
          .bind(resourceCode)
          .first<{ id: string }>();

        if (resource && (amount as number) > 0) {
          const currentResource = await db.prepare(
            'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
          ).bind(city.id, resource.id).first<{ amount: number }>();
          
          const currentAmount = Math.max(0, currentResource?.amount || 0);
          const newAmount = Math.max(0, currentAmount + (amount as number));
          
          await db.prepare(
            `INSERT INTO city_resources (city_id, resource_id, amount, protected)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
          )
            .bind(city.id, resource.id, newAmount, 0, newAmount)
            .run();
        }
      }
    }

    await db.prepare(
      'UPDATE milestones SET claimed_at = ? WHERE id = ?'
    )
      .bind(now, milestoneId)
      .run();

    return { success: true };
  }
}

