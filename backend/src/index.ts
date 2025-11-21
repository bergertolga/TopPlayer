import { Env } from './types';
import { IdleProgression } from './game/idle';
import { AdventureBattle } from './game/adventure';
import { HeroManager } from './game/heroes';
import { OfflineCalculator } from './game/offline';
import { PurchaseRewards } from './game/purchases';
import { validateUserId, validateUsername, validateEmail, validateProductId, validateAmount, validateTransactionId, ValidationError } from './utils/validation';

export { MarketDO } from './durable-objects/market';
export { RealmDO } from './durable-objects/realm-do';
export { KingdomDO } from './durable-objects/kingdom-do';
export { CityDO } from './durable-objects/city-do';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Kingdoms Persist API (new architecture)
      if (path.startsWith('/realm/') || path.startsWith('/kingdom/') || path.startsWith('/city/') || path === '/ws') {
        const { handleKingdomsPersistAPI } = await import('./api/kingdoms-persist/routes');
        return handleKingdomsPersistAPI(request, env);
      }
      
      // Legacy Kingdom Ledger API
      if (path.startsWith('/api/v1/city') || path.startsWith('/api/v1/tick')) {
        const { handleCity } = await import('./api/v1/city');
        return handleCity(request, env);
      } else if (path.startsWith('/api/v1/market')) {
        const { handleMarket } = await import('./api/v1/market');
        return handleMarket(request, env);
      } else if (path.startsWith('/api/v1/routes')) {
        const { handleRoutes } = await import('./api/v1/routes');
        return handleRoutes(request, env);
      } else if (path.startsWith('/api/v1/council')) {
        const { handleCouncil } = await import('./api/v1/council');
        return handleCouncil(request, env);
      } else if (path.startsWith('/api/v1/pve')) {
        const { handlePve } = await import('./api/v1/pve');
        return handlePve(request, env);
      } else if (path.startsWith('/api/v1/events')) {
        const { handleEvents } = await import('./api/v1/events');
        return handleEvents(request, env);
      } else if (path.startsWith('/api/v1/achievements')) {
        const { handleAchievements } = await import('./api/v1/achievements');
        return handleAchievements(request, env);
      }
      
      
      if (path.startsWith('/api/auth')) {
        return handleAuth(request, env, corsHeaders);
      } else if (path.startsWith('/api/progress')) {
        return handleProgress(request, env, corsHeaders);
      } else if (path.startsWith('/api/heroes')) {
        return handleHeroes(request, env, corsHeaders);
      } else if (path.startsWith('/api/adventure')) {
        return handleAdventure(request, env, corsHeaders);
      } else if (path.startsWith('/api/v1/army')) {
        const { handleArmy } = await import('./api/v1/army');
        return handleArmy(request, env);
      } else if (path.startsWith('/api/purchase')) {
        return handlePurchase(request, env, corsHeaders);
      } else if (path.startsWith('/api/leaderboard')) {
        return handleLeaderboard(request, env, corsHeaders);
      } else if (path.startsWith('/api/social')) {
        return handleSocial(request, env, corsHeaders);
      } else if (path.startsWith('/api/analytics')) {
        return handleAnalytics(request, env, corsHeaders);
      } else if (path.startsWith('/api/daily-rewards')) {
        const userId = new URL(request.url).searchParams.get('userId') || request.headers.get('X-User-ID');
        if (!userId) {
          return jsonResponse({ error: 'User ID required' }, 400, corsHeaders);
        }
        const { handleDailyRewards } = await import('./api/daily-rewards');
        return handleDailyRewards(request, env, userId);
      } else {
        return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
      }
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse(
        { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
        500,
        corsHeaders
      );
    }
  },
};

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

async function handleAuth(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  
  if (request.method === 'POST' && url.pathname === '/api/auth/register') {
    const body = await request.json() as { username: string; email?: string };
    
    try {
      
      const username = validateUsername(body.username);
      const email = validateEmail(body.email);
      
      const userId = crypto.randomUUID();
      const now = Date.now();

      await env.DB.prepare(
        'INSERT INTO users (id, username, email, created_at, last_active) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(userId, username, email, now, now)
        .run();

      
      await env.DB.prepare(
        'INSERT INTO user_progress (user_id, total_currency, premium_currency, energy, max_energy, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(userId, 0, 0, 100, 100, now)
        .run();

      
      await env.DB.prepare(
        'INSERT INTO user_daily_rewards (id, user_id, last_claim_date, current_streak) VALUES (?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), userId, 0, 0)
        .run();

      
      
      const region = await env.DB.prepare(
        'SELECT id FROM regions WHERE id = ? OR name = ? LIMIT 1'
      )
        .bind('region-heartlands', 'Heartlands')
        .first<{ id: string }>();

      if (region) {
        const cityId = crypto.randomUUID();
        const cityName = `${username}'s City`;
        
        
        await env.DB.prepare(
          'INSERT INTO cities (id, user_id, region_id, name, level, population, happiness, last_tick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(cityId, userId, region.id, cityName, 1, 100, 0.9, now, now)
          .run();

        
        const startingResources = {
          WOOD: 200,
          STONE: 200,
          FOOD: 300,
          COINS: 1000
        };

        
        for (const [resourceCode, amount] of Object.entries(startingResources)) {
          const resource = await env.DB.prepare(
            'SELECT id FROM resources WHERE code = ?'
          )
            .bind(resourceCode)
            .first<{ id: string }>();

          if (resource) {
            await env.DB.prepare(
              'INSERT INTO city_resources (city_id, resource_id, amount, protected) VALUES (?, ?, ?, ?)'
            )
              .bind(cityId, resource.id, amount, 0)
              .run();
          }
        }

        
        const startingBuildings = [
          { code: 'TOWN_HALL', level: 1 },
          { code: 'FARM', level: 1 },
          { code: 'LUMBER_MILL', level: 1 },
          { code: 'QUARRY', level: 1 },
          { code: 'WAREHOUSE', level: 1 }
        ];
        for (const buildingData of startingBuildings) {
          const building = await env.DB.prepare(
            'SELECT id FROM buildings WHERE code = ?'
          )
            .bind(buildingData.code)
            .first<{ id: string }>();

          if (building) {
            await env.DB.prepare(
              'INSERT INTO city_buildings (city_id, building_id, level, workers, is_active, last_production) VALUES (?, ?, ?, ?, ?, ?)'
            )
              .bind(cityId, building.id, buildingData.level, 0, 1, now)
              .run();
          }
        }
      }

      await env.DB.prepare(
        'UPDATE user_progress SET premium_currency = 10 WHERE user_id = ?'
      )
        .bind(userId)
        .run();

      const { syncTotalCurrency } = await import('./api/v1/city');
      await syncTotalCurrency(env.DB, userId);

      return jsonResponse({ userId, username }, 201, corsHeaders);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return jsonResponse({ error: error.message }, 400, corsHeaders);
      }
      if (error.message?.includes('UNIQUE constraint')) {
        return jsonResponse({ error: 'Username already exists' }, 409, corsHeaders);
      }
      throw error;
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await request.json() as { username: string };
    
    try {
      const username = validateUsername(body.username);
      const now = Date.now();

      const user = await env.DB.prepare(
        'SELECT id, username FROM users WHERE username = ?'
      )
        .bind(username)
        .first<{ id: string; username: string }>();

      if (!user) {
        return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
      }

      
      const city = await env.DB.prepare(
        'SELECT id FROM cities WHERE user_id = ?'
      )
        .bind(user.id)
        .first<{ id: string }>();

      if (!city) {
        
        const region = await env.DB.prepare(
          'SELECT id FROM regions WHERE id = ? OR name = ? LIMIT 1'
        )
          .bind('region-heartlands', 'Heartlands')
          .first<{ id: string }>();

        if (region) {
          const cityId = crypto.randomUUID();
          const cityName = `${username}'s City`;
          
          await env.DB.prepare(
            'INSERT INTO cities (id, user_id, region_id, name, level, population, happiness, last_tick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          )
            .bind(cityId, user.id, region.id, cityName, 1, 100, 0.9, now, now)
            .run();

          
          const startingResources = {
            WOOD: 200,
            STONE: 200,
            FOOD: 300,
            COINS: 1000
          };

          for (const [resourceCode, amount] of Object.entries(startingResources)) {
            const resource = await env.DB.prepare(
              'SELECT id FROM resources WHERE code = ?'
            )
              .bind(resourceCode)
              .first<{ id: string }>();

            if (resource) {
              await env.DB.prepare(
                'INSERT INTO city_resources (city_id, resource_id, amount, protected) VALUES (?, ?, ?, ?)'
              )
                .bind(cityId, resource.id, amount, 0)
                .run();
            }
          }

          
          const startingBuildings = [
            { code: 'TOWN_HALL', level: 1 },
            { code: 'FARM', level: 1 },
            { code: 'LUMBER_MILL', level: 1 },
            { code: 'QUARRY', level: 1 },
            { code: 'WAREHOUSE', level: 1 }
          ];
          for (const buildingData of startingBuildings) {
            const building = await env.DB.prepare(
              'SELECT id FROM buildings WHERE code = ?'
            )
              .bind(buildingData.code)
              .first<{ id: string }>();

            if (building) {
              await env.DB.prepare(
                'INSERT INTO city_buildings (city_id, building_id, level, workers, is_active, last_production) VALUES (?, ?, ?, ?, ?, ?)'
              )
                .bind(cityId, building.id, buildingData.level, 0, 1, now)
                .run();
            }
          }
        }
      }

      
      await env.DB.prepare('UPDATE users SET last_active = ? WHERE id = ?')
        .bind(now, user.id)
        .run();

      return jsonResponse({ userId: user.id, username: user.username }, 200, corsHeaders);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return jsonResponse({ error: error.message }, 400, corsHeaders);
      }
      throw error;
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

async function handleProgress(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  let userId: string;
  
  try {
    userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return jsonResponse({ error: error.message }, 400, corsHeaders);
    }
    throw error;
  }

  if (request.method === 'GET') {
    const progress = await env.DB.prepare(
      'SELECT * FROM user_progress WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ last_offline_calculation: number | null }>();

    if (!progress) {
      return jsonResponse({ error: 'Progress not found' }, 404, corsHeaders);
    }

    
    const offlineCalc = new OfflineCalculator();
    const earnings = await offlineCalc.calculateOfflineEarnings(
      env.DB,
      userId,
      progress.last_offline_calculation
    );

    
    if (earnings.coins > 0 || earnings.gems > 0) {
      await offlineCalc.applyOfflineEarnings(env.DB, userId, earnings);
    }

    
    const { syncTotalCurrency } = await import('./api/v1/city');
    await syncTotalCurrency(env.DB, userId);

    const updatedProgress = await env.DB.prepare(
      'SELECT * FROM user_progress WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    return jsonResponse({ 
      progress: updatedProgress,
      offlineEarnings: earnings.coins > 0 || earnings.gems > 0 ? earnings : undefined
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' || request.method === 'PUT') {
    const body = await request.json() as any;
    const now = Date.now();

    await env.DB.prepare(
      `UPDATE user_progress 
       SET premium_currency = ?, energy = ?, max_energy = ?, 
           current_adventure_stage = ?, last_offline_calculation = ?, data = ?, updated_at = ?
       WHERE user_id = ?`
    )
      .bind(
        body.premium_currency ?? 0,
        body.energy ?? 100,
        body.max_energy ?? 100,
        body.current_adventure_stage ?? 1,
        body.last_offline_calculation ?? null,
        body.data ? JSON.stringify(body.data) : null,
        now,
        userId
      )
      .run();

    const { syncTotalCurrency } = await import('./api/v1/city');
    await syncTotalCurrency(env.DB, userId);

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

async function handleHeroes(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || request.headers.get('X-User-ID');

  if (request.method === 'GET' && url.pathname === '/api/heroes') {
    
    const heroes = await env.DB.prepare('SELECT * FROM heroes ORDER BY base_power').all();
    return jsonResponse({ heroes: heroes.results }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/heroes/user') {
    if (!userId) {
      return jsonResponse({ error: 'User ID required' }, 400, corsHeaders);
    }
    const userHeroes = await env.DB.prepare(
      'SELECT uh.*, h.name, h.rarity, h.base_power, h.element FROM user_heroes uh JOIN heroes h ON uh.hero_id = h.id WHERE uh.user_id = ?'
    )
      .bind(userId)
      .all();
    return jsonResponse({ heroes: userHeroes.results }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/heroes/upgrade') {
    if (!userId) {
      return jsonResponse({ error: 'User ID required' }, 400, corsHeaders);
    }
    const body = await request.json() as { userHeroId: string };
    
    const city = await env.DB.prepare(
      'SELECT id, level FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; level: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    const userHero = await env.DB.prepare(
      'SELECT uh.*, h.base_power, h.upgrade_cost_base FROM user_heroes uh JOIN heroes h ON uh.hero_id = h.id WHERE uh.id = ? AND uh.user_id = ?'
    )
      .bind(body.userHeroId, userId)
      .first<{ level: number; hero_id: string; base_power: number; upgrade_cost_base: number }>();

    if (!userHero) {
      return jsonResponse({ error: 'Hero not found' }, 404, corsHeaders);
    }

    const coinsResource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind('COINS')
      .first<{ id: string }>();

    if (!coinsResource) {
      return jsonResponse({ error: 'COINS resource not found' }, 500, corsHeaders);
    }

    const cityCoins = await env.DB.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    )
      .bind(city.id, coinsResource.id)
      .first<{ amount: number }>();

    const availableCoins = Math.max(0, cityCoins?.amount || 0);

    const heroManager = new HeroManager();
    const { canUpgrade, cost } = heroManager.canUpgrade(
      availableCoins,
      userHero.upgrade_cost_base,
      userHero.level,
      city.level
    );

    if (!canUpgrade) {
      return jsonResponse({ error: 'Insufficient currency', cost }, 400, corsHeaders);
    }

    const newLevel = userHero.level + 1;
    await env.DB.prepare('UPDATE user_heroes SET level = ? WHERE id = ?')
      .bind(newLevel, body.userHeroId)
      .run();

    const newCoinsAmount = Math.max(0, availableCoins - cost);
    await env.DB.prepare(
      `UPDATE city_resources SET amount = ? 
       WHERE city_id = ? AND resource_id = ?`
    )
      .bind(newCoinsAmount, city.id, coinsResource.id)
      .run();

    const newPower = heroManager.calculateHeroPower(userHero.base_power, newLevel);
    const remainingCurrency = newCoinsAmount;

    const { MilestoneSystem } = await import('./game/milestones');
    await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'hero_level_10', newLevel);
    await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'hero_level_20', newLevel);

    return jsonResponse({
      success: true,
      newLevel,
      newPower,
      cost,
      remainingCurrency,
    }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

async function handleAdventure(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || request.headers.get('X-User-ID');

  if (request.method === 'GET' && url.pathname === '/api/adventure/stages') {
    const stages = await env.DB.prepare('SELECT * FROM adventures ORDER BY stage_number').all();
    return jsonResponse({ stages: stages.results }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/adventure/progress') {
    if (!userId) {
      return jsonResponse({ error: 'User ID required' }, 400, corsHeaders);
    }
    const progress = await env.DB.prepare(
      'SELECT * FROM user_adventure_progress WHERE user_id = ?'
    )
      .bind(userId)
      .all();
    return jsonResponse({ progress: progress.results }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/adventure/complete') {
    if (!userId) {
      return jsonResponse({ error: 'User ID required' }, 400, corsHeaders);
    }
    const body = await request.json() as { adventureId: string; heroIds: string[] };
    
    
    const adventure = await env.DB.prepare('SELECT * FROM adventures WHERE id = ?')
      .bind(body.adventureId)
      .first<{ enemy_power: number; reward_coins: number; reward_gems: number; energy_cost: number; stage_number: number }>();

    if (!adventure) {
      return jsonResponse({ error: 'Adventure not found' }, 404, corsHeaders);
    }

    
    const userHeroes = await env.DB.prepare(
      `SELECT uh.level, uh.stars, h.base_power 
       FROM user_heroes uh 
       JOIN heroes h ON uh.hero_id = h.id 
       WHERE uh.id IN (${body.heroIds.map(() => '?').join(',')}) AND uh.user_id = ?`
    )
      .bind(...body.heroIds, userId)
      .all();

    if (userHeroes.results.length === 0) {
      return jsonResponse({ error: 'No heroes found' }, 404, corsHeaders);
    }

    
    const heroManager = new HeroManager();
    const heroPowers = userHeroes.results.map((h: any) => 
      heroManager.calculateHeroPower(h.base_power, h.level, h.stars)
    );
    
    const battle = new AdventureBattle();
    const teamPower = battle.calculateTeamPower(heroPowers);
    const result = battle.calculateBattleResult(teamPower, adventure.enemy_power, adventure.stage_number);

    if (!result.victory) {
      return jsonResponse({ success: false, result }, 200, corsHeaders);
    }

    
    const progress = await env.DB.prepare('SELECT energy FROM user_progress WHERE user_id = ?')
      .bind(userId)
      .first<{ energy: number }>();

    if (!progress || progress.energy < adventure.energy_cost) {
      return jsonResponse({ error: 'Insufficient energy' }, 400, corsHeaders);
    }

    const city = await env.DB.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    await env.DB.prepare(
      `UPDATE user_progress 
       SET premium_currency = premium_currency + ?, 
           energy = energy - ? 
       WHERE user_id = ?`
    )
      .bind(result.rewards.gems, adventure.energy_cost, userId)
      .run();

    if (result.rewards.coins > 0) {
      const coinsResource = await env.DB.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind('COINS')
        .first<{ id: string }>();

      if (coinsResource) {
        const currentCoins = await env.DB.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        ).bind(city.id, coinsResource.id).first<{ amount: number }>();
        
        const currentAmount = Math.max(0, currentCoins?.amount || 0);
        const newAmount = Math.max(0, currentAmount + result.rewards.coins);
        
        await env.DB.prepare(
          `INSERT INTO city_resources (city_id, resource_id, amount, protected)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
        )
          .bind(city.id, coinsResource.id, newAmount, 0, newAmount)
          .run();
      }
    }

    if (result.rewards.resources) {
      for (const [resourceCode, amount] of Object.entries(result.rewards.resources)) {
        const resource = await env.DB.prepare(
          'SELECT id FROM resources WHERE code = ?'
        )
          .bind(resourceCode)
          .first<{ id: string }>();

        if (resource && amount > 0) {
          const currentResource = await env.DB.prepare(
            'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
          ).bind(city.id, resource.id).first<{ amount: number }>();
          
          const currentAmount = Math.max(0, currentResource?.amount || 0);
          const newAmount = Math.max(0, currentAmount + amount);
          
          await env.DB.prepare(
            `INSERT INTO city_resources (city_id, resource_id, amount, protected)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
          )
            .bind(city.id, resource.id, newAmount, 0, newAmount)
            .run();
        }
      }
    }

    // Award hero XP to participating heroes
    // Base XP = stage_number * 10, multiplied by stars
    const baseXP = adventure.stage_number * 10;
    const xpPerHero = Math.floor(baseXP * (1 + result.stars * 0.5));
    
    // Add XP to result for client display
    result.rewards.heroXP = xpPerHero;
    
    const leveledUpHeroes: string[] = [];
    
    for (const heroId of body.heroIds) {
      const hero = await env.DB.prepare(
        'SELECT experience, level FROM user_heroes WHERE id = ? AND user_id = ?'
      )
        .bind(heroId, userId)
        .first<{ experience: number; level: number }>();

      if (hero) {
        const oldLevel = hero.level || 1;
        let newXP = (hero.experience || 0) + xpPerHero;
        let newLevel = oldLevel;
        
        // Simple level-up calculation: 100 XP per level
        const xpForNextLevel = newLevel * 100;
        while (newXP >= xpForNextLevel && newLevel < 100) {
          newXP -= xpForNextLevel;
          newLevel += 1;
        }
        
        if (newLevel > oldLevel) {
          leveledUpHeroes.push(heroId);
        }
        
        await env.DB.prepare(
          'UPDATE user_heroes SET experience = ?, level = ? WHERE id = ?'
        )
          .bind(newXP, newLevel, heroId)
          .run();
      }
    }

    
    const existingProgress = await env.DB.prepare(
      'SELECT * FROM user_adventure_progress WHERE user_id = ? AND adventure_id = ?'
    )
      .bind(userId, body.adventureId)
      .first<{ stars_earned: number; best_time: number | null }>();

    if (existingProgress) {
      
      const newStars = Math.max(existingProgress.stars_earned, result.stars);
      const newBestTime = existingProgress.best_time 
        ? Math.min(existingProgress.best_time, result.time)
        : result.time;
      
      await env.DB.prepare(
        `UPDATE user_adventure_progress 
         SET stars_earned = ?, completed_at = ?, best_time = ?
         WHERE user_id = ? AND adventure_id = ?`
      )
        .bind(newStars, Date.now(), newBestTime, userId, body.adventureId)
        .run();
    } else {
      
      const progressId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO user_adventure_progress (id, user_id, adventure_id, stars_earned, completed_at, best_time)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(progressId, userId, body.adventureId, result.stars, Date.now(), result.time)
        .run();
    }

    return jsonResponse({ 
      success: true, 
      result,
      leveledUpHeroes: leveledUpHeroes.length > 0 ? leveledUpHeroes : undefined
    }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

async function handlePurchase(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || request.headers.get('X-User-ID');

  if (!userId) {
    return jsonResponse({ error: 'User ID required' }, 400, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/purchase/verify') {
    const body = await request.json() as { 
      productId: string; 
      transactionId: string; 
      receiptData: string;
      amount: number;
    };

    try {
      
      const productId = validateProductId(body.productId);
      const transactionId = validateTransactionId(body.transactionId);
      const amount = validateAmount(body.amount);
      
      
      const existingPurchase = await env.DB.prepare(
        'SELECT id FROM purchases WHERE transaction_id = ?'
      )
        .bind(transactionId)
        .first<{ id: string }>();

      if (existingPurchase) {
        return jsonResponse({ 
          success: true, 
          purchaseId: existingPurchase.id,
          message: 'Purchase already processed'
        }, 200, corsHeaders);
      }

      
      // Verify Apple receipt/transaction
      const { verifyAppleTransaction, verifyAppleReceipt } = await import('./utils/apple-receipt');
      
      // Try transaction-based verification first (StoreKit 2)
      let verificationResult = await verifyAppleTransaction(
        transactionId,
        productId,
        'Production', // Will auto-retry with Sandbox if needed
        body.receiptData
      );
      
      // If transaction verification fails and we have receipt data, try receipt verification (StoreKit 1)
      if (!verificationResult.verified && body.receiptData) {
        verificationResult = await verifyAppleReceipt(
          body.receiptData,
          productId,
          'Production'
        );
      }
      
      if (!verificationResult.verified) {
        return jsonResponse({
          success: false,
          error: verificationResult.error || 'Receipt verification failed',
          purchaseId: null
        }, 400, corsHeaders);
      }
      
      const isVerified = true; // Set to true after successful verification 

      const purchaseId = crypto.randomUUID();
      const now = Date.now();

      
      await env.DB.prepare(
        'INSERT INTO purchases (id, user_id, product_id, transaction_id, receipt_data, amount, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(purchaseId, userId, productId, transactionId, body.receiptData, amount, isVerified, now)
        .run();

      
      const rewardResult = await PurchaseRewards.grantRewards(
        env.DB,
        userId,
        productId
      );

      if (!rewardResult.success) {
        return jsonResponse({ 
          success: false, 
          error: 'Unknown product ID',
          purchaseId 
        }, 400, corsHeaders);
      }

      
      await env.DB.prepare(
        'UPDATE users SET total_spent = total_spent + ? WHERE id = ?'
      )
        .bind(amount, userId)
        .run();

      
      await env.DB.prepare(
        'INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(
          crypto.randomUUID(),
          userId,
          'purchase_completed',
          JSON.stringify({ productId, amount, rewards: rewardResult.rewards }),
          now
        )
        .run();

      return jsonResponse({ 
        success: true, 
        purchaseId,
        rewards: rewardResult.rewards
      }, 200, corsHeaders);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return jsonResponse({ 
          success: false,
          error: error.message 
        }, 400, corsHeaders);
      }
      throw error;
    }
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

async function handleLeaderboard(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  return jsonResponse({ message: 'Leaderboard feature coming soon' }, 200, corsHeaders);
}

async function handleSocial(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  return jsonResponse({ message: 'Social features coming soon' }, 200, corsHeaders);
}

async function handleAnalytics(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'POST') {
    const body = await request.json() as { userId?: string; eventType: string; eventData?: any };
    const now = Date.now();
    const eventId = crypto.randomUUID();

    await env.DB.prepare(
      'INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(eventId, body.userId || null, body.eventType, body.eventData ? JSON.stringify(body.eventData) : null, now)
      .run();

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

