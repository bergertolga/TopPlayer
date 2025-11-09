import { IdleProgression, OfflineEarnings } from './idle';

export class OfflineCalculator {
  private idleSystem: IdleProgression;

  constructor() {
    this.idleSystem = new IdleProgression();
  }

  async calculateOfflineEarnings(
    db: D1Database,
    userId: string,
    lastOfflineTime: number | null
  ): Promise<OfflineEarnings> {
    const now = Date.now();
    const timeOfflineSeconds = lastOfflineTime 
      ? Math.floor((now - lastOfflineTime) / 1000)
      : 0;

    if (timeOfflineSeconds <= 0) {
      return { coins: 0, gems: 0, experience: 0, timeOffline: 0 };
    }

    const userHeroes = await db.prepare(
      `SELECT uh.level, uh.stars, h.base_power 
       FROM user_heroes uh 
       JOIN heroes h ON uh.hero_id = h.id 
       WHERE uh.user_id = ?`
    )
      .bind(userId)
      .all();

    if (userHeroes.results.length === 0) {
      return { coins: 0, gems: 0, experience: 0, timeOffline: timeOfflineSeconds };
    }

    const user = await db.prepare('SELECT prestige_count FROM users WHERE id = ?')
      .bind(userId)
      .first<{ prestige_count: number }>();

    const prestigeMultiplier = user 
      ? this.idleSystem.calculatePrestigeMultiplier(user.prestige_count || 0)
      : 1.0;

    const upgrades = await db.prepare(
      `SELECT u.effect_value, u.effect_type 
       FROM user_upgrades uu 
       JOIN upgrades u ON uu.upgrade_id = u.id 
       WHERE uu.user_id = ? AND u.type = 'global'`
    )
      .bind(userId)
      .all();

    let multiplier = prestigeMultiplier;
    for (const upgrade of upgrades.results as any[]) {
      if (upgrade.effect_type === 'multiplier') {
        multiplier *= upgrade.effect_value;
      }
    }

    const heroLevels = userHeroes.results.map((h: any) => h.level);
    const earnings = this.idleSystem.calculateOfflineEarnings(
      timeOfflineSeconds,
      heroLevels,
      multiplier
    );

    return earnings;
  }

  async applyOfflineEarnings(
    db: D1Database,
    userId: string,
    earnings: OfflineEarnings
  ): Promise<void> {
    const now = Date.now();

    const city = await db.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (city && earnings.coins > 0) {
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
        const newAmount = Math.max(0, currentAmount + earnings.coins);
        
        await db.prepare(
          `INSERT INTO city_resources (city_id, resource_id, amount, protected)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
        )
          .bind(city.id, coinsResource.id, newAmount, 0, newAmount)
          .run();
      }
    }

    await db.prepare(
      `UPDATE user_progress 
       SET premium_currency = premium_currency + ?, 
           last_offline_calculation = ?,
           updated_at = ?
       WHERE user_id = ?`
    )
      .bind(earnings.gems, now, now, userId)
      .run();

    if (earnings.experience > 0) {
      const { ExperienceSystem } = await import('./experience');
      const expSystem = new ExperienceSystem();
      await expSystem.distributeExperience(db, userId, earnings.experience);
    }
  }
}
