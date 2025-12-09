import { Env } from './types';
import { IdleProgression } from './game/idle';
import { OfflineCalculator } from './game/offline';
import { PurchaseRewards } from './game/purchases';
import { validateUserId, validateUsername, validateEmail, validateProductId, validateAmount, validateTransactionId, ValidationError } from './utils/validation';
import { handleRealm } from './api/realm';
import { handleWorld } from './api/world';
import { handleWorldEvents } from './api/world-events';
import { handleGuilds } from './api/guilds';
import { handleShop } from './api/v1/shop';
import { handleChat } from './api/chat';
import { jsonResponse } from './utils/responses';

export { MarketDO } from './durable-objects/market';
export { RealmDO } from './durable-objects/realm-do';
export { KingdomDO } from './durable-objects/kingdom-do';
export { CityDO } from './durable-objects/city-do';

const DISABLED_LEGACY_PREFIXES = [
  '/api/purchase',
  '/api/leaderboard',
  '/api/social',
  '/api/analytics',
  '/api/heroes',
  '/api/adventure',
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
    };

    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (DISABLED_LEGACY_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        return jsonResponse({ error: 'Legacy endpoint disabled' }, 410, corsHeaders);
      }

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
      } else if (path.startsWith('/api/v1/events')) {
        const { handleEvents } = await import('./api/v1/events');
        return handleEvents(request, env);
      } else if (path.startsWith('/api/v1/leaderboards')) {
        const { handleLeaderboards } = await import('./api/v1/leaderboards');
        return handleLeaderboards(request, env);
      } else if (path.startsWith('/api/v1/notifications')) {
        const { handleNotifications } = await import('./api/v1/notifications');
        return handleNotifications(request, env);
      } else if (path.startsWith('/api/v1/achievements')) {
        const { handleAchievements } = await import('./api/v1/achievements');
        return handleAchievements(request, env);
      } else if (path.startsWith('/api/v1/premium') || path.startsWith('/api/v1/shop')) {
        return handleShop(request, env);
      } else if (path.startsWith('/api/v1/quests')) {
        const { handleQuests } = await import('./api/v1/quests');
        return handleQuests(request, env);
      } else if (path.startsWith('/api/v1/chat')) {
        return handleChat(request, env);
      } else if (path.startsWith('/api/v1/guilds')) {
        return handleGuilds(request, env);
      } else if (path.startsWith('/api/v1/world/events') || path.startsWith('/api/v1/npc')) {
        return handleWorldEvents(request, env);
      } else if (path.startsWith('/api/v1/world')) {
        return handleWorld(request, env);
      }
      
      
      if (path.startsWith('/api/auth')) {
        return handleAuth(request, env, corsHeaders);
      } else if (path.startsWith('/api/progress')) {
        return handleProgress(request, env, corsHeaders);
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
      } else if (path.startsWith('/api/v1/council')) {
        const { handleCouncil } = await import('./api/v1/council');
        return handleCouncil(request, env);
      } else if (path.startsWith('/api/v1/realm')) {
        return handleRealm(request, env);
      } else if (path.startsWith('/api/v1/contracts')) {
        const { handleContracts } = await import('./api/v1/contracts');
        return handleContracts(request, env);
      } else if (path.startsWith('/api/v1/combat')) {
        const { handleCombat } = await import('./api/v1/combat');
        return handleCombat(request, env);
      } else if (path.startsWith('/api/v1/client/overview')) {
        const { handleClientSummary } = await import('./api/v1/client-summary');
        return handleClientSummary(request, env);
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
      }

      return jsonResponse({ userId, username, email }, 201, corsHeaders);
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return jsonResponse({ error: 'Username or email already exists' }, 409, corsHeaders);
      }
      throw error;
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await request.json() as { username: string };
    
    if (!body.username) {
      return jsonResponse({ error: 'Username required' }, 400, corsHeaders);
    }

      const user = await env.DB.prepare(
      'SELECT id, username, email, created_at, last_active FROM users WHERE username = ?'
      )
      .bind(body.username)
      .first();

      if (!user) {
        return jsonResponse({ error: 'User not found' }, 404, corsHeaders);
      }

      
      await env.DB.prepare('UPDATE users SET last_active = ? WHERE id = ?')
      .bind(Date.now(), (user as any).id)
        .run();

    return jsonResponse({ user }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

async function handleProgress(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return jsonResponse({ error: 'User ID required' }, 400, corsHeaders);
  }

  if (request.method === 'GET') {
    const progress = await env.DB.prepare(
      'SELECT * FROM user_progress WHERE user_id = ?'
    )
      .bind(userId)
      .first();

    if (!progress) {
      return jsonResponse({ error: 'Progress not found' }, 404, corsHeaders);
    }

    return jsonResponse({ progress }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

async function handlePurchase(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  if (request.method === 'POST') {
    const body = await request.json() as { userId: string; productId: string; transactionId: string; receiptData?: string };
    
    try {
      validateUserId(body.userId);
      validateProductId(body.productId);
      validateTransactionId(body.transactionId);

      const purchaseId = crypto.randomUUID();
      const now = Date.now();

      
      await env.DB.prepare(
        'INSERT INTO purchases (id, user_id, product_id, transaction_id, receipt_data, amount, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
        .bind(purchaseId, body.userId, body.productId, body.transactionId, body.receiptData || null, 0.99, now) 
        .run();

      
      const rewardAmount = body.productId.includes('gem') ? 100 : 500; 
      
      await env.DB.prepare(
        'UPDATE user_progress SET premium_currency = premium_currency + ? WHERE user_id = ?'
      )
        .bind(rewardAmount, body.userId)
        .run();

      return jsonResponse({ success: true, rewardAmount }, 200, corsHeaders);
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400, corsHeaders);
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
