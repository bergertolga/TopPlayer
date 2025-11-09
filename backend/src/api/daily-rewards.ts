import { Env } from '../types';

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function handleDailyRewards(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const url = new URL(request.url);
  
  
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method === 'GET' && url.pathname === '/api/daily-rewards/status') {
    
    const dailyReward = await env.DB.prepare(
      'SELECT * FROM user_daily_rewards WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ last_claim_date: number; current_streak: number; longest_streak: number }>();

    if (!dailyReward) {
      return jsonResponse({
        currentStreak: 0,
        longestStreak: 0,
        lastClaimDate: null,
        canClaim: true,
      });
    }

    
    const now = Date.now();
    const lastClaim = new Date(dailyReward.last_claim_date);
    const today = new Date(now);
    const canClaim = lastClaim.toDateString() !== today.toDateString();

    return jsonResponse({
      currentStreak: dailyReward.current_streak,
      longestStreak: dailyReward.longest_streak,
      lastClaimDate: dailyReward.last_claim_date,
      canClaim,
    });
  }

  if (request.method === 'POST' && url.pathname === '/api/daily-rewards/claim') {
    
    const now = Date.now();
    const today = Math.floor(now / (1000 * 60 * 60 * 24)); 

    
    let dailyReward = await env.DB.prepare(
      'SELECT * FROM user_daily_rewards WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ last_claim_date: number; current_streak: number }>();

    if (!dailyReward) {
      const id = crypto.randomUUID();
      await env.DB.prepare(
        'INSERT INTO user_daily_rewards (id, user_id, last_claim_date, current_streak) VALUES (?, ?, ?, ?)'
      )
        .bind(id, userId, now, 1)
        .run();
      dailyReward = { last_claim_date: now, current_streak: 1 };
    } else {
      const lastClaim = Math.floor(dailyReward.last_claim_date / (1000 * 60 * 60 * 24));
      const daysDiff = today - lastClaim;

      let newStreak = dailyReward.current_streak;
      if (daysDiff === 1) {
        
        newStreak += 1;
      } else if (daysDiff > 1) {
        
        newStreak = 1;
      } else {
        
        return jsonResponse({ error: 'Already claimed today' }, 400);
      }

      
      const currentLongest = await env.DB.prepare(
        'SELECT longest_streak FROM user_daily_rewards WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ longest_streak: number }>();
      
      const updatedLongest = Math.max(currentLongest?.longest_streak || 0, newStreak);
      
      await env.DB.prepare(
        `UPDATE user_daily_rewards 
         SET last_claim_date = ?, current_streak = ?, longest_streak = ?
         WHERE user_id = ?`
      )
        .bind(now, newStreak, updatedLongest, userId)
        .run();
      
      dailyReward = { last_claim_date: now, current_streak: newStreak };
    }

    
    const dayNumber = ((dailyReward.current_streak - 1) % 7) + 1;
    const reward = await env.DB.prepare(
      'SELECT * FROM daily_rewards WHERE day_number = ?'
    )
      .bind(dayNumber)
      .first<{ reward_type: string; reward_value: number; reward_data: string | null }>();

    if (!reward) {
      return jsonResponse({ error: 'Reward not found' }, 404);
    }

    
    if (reward.reward_type === 'coins') {
      const city = await env.DB.prepare(
        'SELECT id FROM cities WHERE user_id = ?'
      )
        .bind(userId)
        .first<{ id: string }>();

      if (city) {
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
          const newAmount = Math.max(0, currentAmount + reward.reward_value);
          
          await env.DB.prepare(
            `INSERT INTO city_resources (city_id, resource_id, amount, protected)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
          )
            .bind(city.id, coinsResource.id, newAmount, 0, newAmount)
            .run();
        }
      }
    } else if (reward.reward_type === 'gems') {
      await env.DB.prepare(
        'UPDATE user_progress SET premium_currency = premium_currency + ? WHERE user_id = ?'
      )
        .bind(reward.reward_value, userId)
        .run();
    }

    return jsonResponse({
      success: true,
      reward: {
        type: reward.reward_type,
        value: reward.reward_value,
      },
      streak: dailyReward.current_streak,
    });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

