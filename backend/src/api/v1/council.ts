import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';
import { mutatePremiumWallet } from '../../utils/premium';
import { handleCouncilTech } from './council-tech';

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

async function getCityForUser(db: D1Database, userId: string) {
  return db.prepare('SELECT * FROM cities WHERE user_id = ?').bind(userId).first<{
    id: string;
    region_id: string;
    level: number;
  }>();
}

async function adjustCityResource(db: D1Database, cityId: string, resourceCode: string, delta: number) {
  const resource = await db.prepare('SELECT id FROM resources WHERE code = ?').bind(resourceCode).first<{ id: string }>();
  if (!resource) {
    throw new Error(`Resource ${resourceCode} not found`);
  }
  await db.prepare(
    `INSERT INTO city_resources (city_id, resource_id, amount, protected)
     VALUES (?, ?, MAX(0, ?), 0)
     ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = MAX(0, city_resources.amount + ?)`
  )
    .bind(cityId, resource.id, delta, delta)
    .run();
}

async function adjustFavor(db: D1Database, userId: string, delta: number) {
  await db.prepare(
    `INSERT INTO capital_favor_stats (user_id, favor_points, last_contribution)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET favor_points = favor_points + excluded.favor_points`
  )
    .bind(userId, delta, Date.now())
    .run();
}

async function grantGuildRewards(env: Env, userId: string, cityId: string, rewards: any) {
  if (!rewards) return;
  if (rewards.coins) {
    await adjustCityResource(env.DB, cityId, 'COINS', rewards.coins);
  }
  if (rewards.crowns) {
    await mutatePremiumWallet(env.DB, userId, { crowns: rewards.crowns }, { reason: 'council_reward', metadata: { source: 'council' } });
  }
  if (rewards.favor) {
    await mutatePremiumWallet(env.DB, userId, { favor: rewards.favor }, { reason: 'council_reward', metadata: { source: 'council' } });
    await adjustFavor(env.DB, userId, rewards.favor);
  }
  if (rewards.resources && typeof rewards.resources === 'object') {
    for (const [code, amount] of Object.entries(rewards.resources)) {
      await adjustCityResource(env.DB, cityId, code, amount as number);
    }
  }
  if (rewards.boost) {
    await env.DB.prepare(
      'INSERT INTO boost_activations (id, user_id, boost_code, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        crypto.randomUUID(),
        userId,
        rewards.boost.code,
        JSON.stringify(rewards.boost),
        Date.now() + Math.floor((rewards.boost.hours ?? rewards.boost.duration ?? 0) * 60 * 60 * 1000),
        Date.now()
      )
      .run();
  }
  if (Array.isArray(rewards.boosts)) {
    for (const boost of rewards.boosts) {
      await env.DB.prepare(
        'INSERT INTO boost_activations (id, user_id, boost_code, metadata_json, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(
          crypto.randomUUID(),
          userId,
          boost.code,
          JSON.stringify(boost),
          Date.now() + Math.floor((boost.hours ?? boost.duration ?? 0) * 60 * 60 * 1000),
          Date.now()
        )
        .run();
    }
  }
}

async function syncGuildMembership(db: D1Database, userId: string, guildCode?: string) {
  if (!guildCode) {
    await db.prepare('DELETE FROM guild_membership WHERE user_id = ?').bind(userId).run();
    return;
  }
  await db.prepare(
    `INSERT INTO guild_membership (user_id, guild_code, joined_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET guild_code = excluded.guild_code, joined_at = excluded.joined_at`
  )
    .bind(userId, guildCode, Date.now())
    .run();
}

export async function handleCouncil(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let userId: string;
  try {
    userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400, corsHeaders);
  }

  // Tech Routes delegation
  if (url.pathname.includes('/tech')) {
    const member = await env.DB.prepare('SELECT council_id FROM council_members WHERE user_id = ?').bind(userId).first<{ council_id: string }>();
    if (!member) return jsonResponse({ error: 'Not in a council' }, 400, corsHeaders);
    return handleCouncilTech(request, env, userId, member.council_id);
  }

  if (request.method === 'GET' && url.pathname.match(/^\/api\/v1\/council\/profile\/[\w-]+$/)) {
    const councilId = url.pathname.split('/').pop()!;
    
    const council = await env.DB.prepare(`
      SELECT c.*, 
             u.username as steward_name,
             (SELECT COUNT(*) FROM council_members WHERE council_id = c.id) as members_count
      FROM councils c
      JOIN users u ON c.steward_user_id = u.id
      WHERE c.id = ?
    `).bind(councilId).first<any>();

    if (!council) return jsonResponse({ error: 'Council not found' }, 404, corsHeaders);

    // Get active tech
    const tech = await env.DB.prepare(`
        SELECT t.name, p.status 
        FROM council_tech_progress p 
        JOIN council_tech_tree t ON p.tech_id = t.id 
        WHERE p.council_id = ? AND p.status = 'completed'
    `).bind(councilId).all();

    return jsonResponse({
      identity: {
        id: council.id,
        name: council.name,
        motto: council.motto,
        focus: council.primary_focus,
        badgeId: council.badge_id,
        prestige: council.prestige_score || 0
      },
      stats: {
        members: council.members_count,
        treasury: council.treasury_balance || 0
      },
      tech: tech.results || [],
      leader: council.steward_name
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/create') {
    const body = await request.json() as { name: string; guildCode: string };

    if (!body.name || body.name.length < 3 || body.name.length > 30) {
      return jsonResponse({ error: 'Council name must be 3-30 characters' }, 400, corsHeaders);
    }

    if (!body.guildCode) {
      return jsonResponse({ error: 'guildCode required' }, 400, corsHeaders);
    }

    
    const city = await getCityForUser(env.DB, userId);

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 10) {
      return jsonResponse({ error: 'Council unlocks at city level 10' }, 403, corsHeaders);
    }

    const archetype = await env.DB.prepare(
      'SELECT * FROM guild_archetypes WHERE code = ?'
    )
      .bind(body.guildCode)
      .first();

    if (!archetype) {
      return jsonResponse({ error: 'Unknown guild archetype' }, 404, corsHeaders);
    }

    
    const councilId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO councils (id, name, steward_user_id, region_id, tax_rate, guild_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(councilId, body.name, userId, city.region_id, 0.01, body.guildCode, Date.now())
      .run();

    
    await env.DB.prepare(
      'INSERT INTO council_members (council_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
    )
      .bind(councilId, userId, 'steward', Date.now())
      .run();
    await syncGuildMembership(env.DB, userId, body.guildCode);

    return jsonResponse({ councilId, name: body.name }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/join') {
    const body = await request.json() as { councilId: string };

    
    const existing = await env.DB.prepare(
      'SELECT * FROM council_members WHERE council_id = ? AND user_id = ?'
    )
      .bind(body.councilId, userId)
      .first();

    if (existing) {
      return jsonResponse({ error: 'Already a member' }, 400, corsHeaders);
    }

    
    await env.DB.prepare(
      'INSERT INTO council_members (council_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
    )
      .bind(body.councilId, userId, 'member', Date.now())
      .run();

    const council = await env.DB.prepare('SELECT guild_code FROM councils WHERE id = ?').bind(body.councilId).first<{ guild_code: string | null }>();
    if (council?.guild_code) {
      await syncGuildMembership(env.DB, userId, council.guild_code);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/leave') {
    const membership = await env.DB.prepare(
      'SELECT * FROM council_members WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ council_id: string; role: string }>();

    if (!membership) {
      return jsonResponse({ error: 'Not part of a council' }, 400, corsHeaders);
    }

    if (membership.role === 'steward') {
      return jsonResponse({ error: 'Steward must transfer leadership before leaving' }, 400, corsHeaders);
    }

    await env.DB.prepare(
      'DELETE FROM council_members WHERE council_id = ? AND user_id = ?'
    )
      .bind(membership.council_id, userId)
      .run();
    await syncGuildMembership(env.DB, userId, undefined);

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/council/list') {
    const councils = await env.DB.prepare(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM council_members cm WHERE cm.council_id = c.id) as members
       FROM councils c
       ORDER BY c.created_at DESC`
    ).all();

    return jsonResponse({ councils: councils.results }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/council') {
    
    const city = await env.DB.prepare(
      'SELECT region_id, level FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ region_id: string; level: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 10) {
      return jsonResponse({ error: 'Council unlocks at city level 10' }, 403, corsHeaders);
    }

    const membership = await env.DB.prepare(
      'SELECT council_id FROM council_members WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ council_id: string }>();

    let councilQuery = env.DB.prepare(
      `SELECT c.*, u.username as steward_name, 
              COALESCE(c.treasury_balance, 0) as treasury_balance
       FROM councils c
       JOIN users u ON c.steward_user_id = u.id
       WHERE c.id = ?`
    );

    let council;

    if (membership) {
      council = await councilQuery.bind(membership.council_id).first();
    } else {
      council = await env.DB.prepare(
        `SELECT c.*, u.username as steward_name, 
                COALESCE(c.treasury_balance, 0) as treasury_balance
         FROM councils c
         JOIN users u ON c.steward_user_id = u.id
         WHERE c.region_id = ?
         ORDER BY c.created_at DESC`
      )
        .bind(city.region_id)
        .first();
    }

    if (!council) {
      return jsonResponse({ council: null }, 200, corsHeaders);
    }

    
    const members = await env.DB.prepare(
      `SELECT cm.*, u.username
       FROM council_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.council_id = ?
       ORDER BY cm.joined_at ASC`
    )
      .bind((council as any).id)
      .all();

    
    const publicWorks = await env.DB.prepare(
      'SELECT * FROM public_works WHERE council_id = ? AND status = ? ORDER BY created_at DESC'
    )
      .bind((council as any).id, 'active')
      .all();

    let guild = null;
    if ((council as any).guild_code) {
      guild = await env.DB.prepare('SELECT * FROM guild_archetypes WHERE code = ?')
        .bind((council as any).guild_code)
        .first<{ code: string; name: string; description: string; perk_json: string }>();
    }

    return jsonResponse({
      council,
      members: members.results,
      publicWorks: publicWorks.results,
      guild: guild
        ? {
            code: guild.code,
            name: guild.name,
            description: guild.description,
            perks: JSON.parse(guild.perk_json || '{}'),
          }
        : null,
    }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/council/chat') {
    const membership = await env.DB.prepare(
      `SELECT * FROM council_members WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ council_id: string }>();

    if (!membership) {
      return jsonResponse({ error: 'Join a council to use chat' }, 403, corsHeaders);
    }

    const messages = await env.DB.prepare(
      `SELECT cm.*, u.username 
       FROM council_messages cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.council_id = ?
       ORDER BY cm.created_at DESC
       LIMIT 50`
    )
      .bind(membership.council_id)
      .all();

    return jsonResponse({ messages: messages.results }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/chat') {
    const body = await request.json() as { message: string };

    if (!body.message || body.message.trim().length === 0) {
      return jsonResponse({ error: 'Message cannot be empty' }, 400, corsHeaders);
    }

    const membership = await env.DB.prepare(
      `SELECT * FROM council_members WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ council_id: string }>();

    if (!membership) {
      return jsonResponse({ error: 'Join a council to use chat' }, 403, corsHeaders);
    }

    await env.DB.prepare(
      'INSERT INTO council_messages (id, council_id, user_id, message, created_at) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), membership.council_id, userId, body.message.trim(), Date.now())
      .run();

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/tax') {
    const body = await request.json() as { rate: number };

    if (body.rate < 0 || body.rate > 0.05) {
      return jsonResponse({ error: 'Tax rate must be between 0 and 0.05' }, 400, corsHeaders);
    }

    
    const council = await env.DB.prepare(
      `SELECT c.* FROM councils c
       JOIN cities city ON c.region_id = city.region_id
       WHERE city.user_id = ? AND c.steward_user_id = ?`
    )
      .bind(userId, userId)
      .first();

    if (!council) {
      return jsonResponse({ error: 'Not authorized' }, 403, corsHeaders);
    }

    
    await env.DB.prepare(
      'UPDATE councils SET tax_rate = ? WHERE id = ?'
    )
      .bind(body.rate, (council as any).id)
      .run();

    return jsonResponse({ success: true, taxRate: body.rate }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/public-works/create') {
    const body = await request.json() as {
      projectCode: string;
      name: string;
      description?: string;
      requiredResources: Record<string, number>;
      regionBonus?: Record<string, any>;
    };

    if (!body.projectCode || !body.name || !body.requiredResources) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    // Verify user is steward
    const city = await env.DB.prepare(
      'SELECT region_id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ region_id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    const council = await env.DB.prepare(
      `SELECT c.* FROM councils c
       WHERE c.region_id = ? AND c.steward_user_id = ?`
    )
      .bind(city.region_id, userId)
      .first();

    if (!council) {
      return jsonResponse({ error: 'Not authorized. Only stewards can create public works.' }, 403, corsHeaders);
    }

    const publicWorkId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO public_works (id, council_id, project_code, name, description, required_resources_json, contributed_resources_json, region_bonus_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        publicWorkId,
        (council as any).id,
        body.projectCode,
        body.name,
        body.description || '',
        JSON.stringify(body.requiredResources),
        JSON.stringify({}),
        body.regionBonus ? JSON.stringify(body.regionBonus) : null,
        'active',
        Date.now()
      )
      .run();

    return jsonResponse({ 
      success: true, 
      publicWorkId,
      message: 'Public works project created'
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/public-works/contribute') {
    const body = await request.json() as {
      publicWorkId: string;
      contributions: Record<string, number>;
    };

    if (!body.publicWorkId || !body.contributions) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    const { PublicWorksProcessor } = await import('../../game/public-works');
    const result = await PublicWorksProcessor.contributeToPublicWork(
      env.DB,
      body.publicWorkId,
      userId,
      body.contributions
    );

    if (!result.success) {
      return jsonResponse({ 
        success: false,
        error: result.error 
      }, 400, corsHeaders);
    }

    return jsonResponse({
      success: true,
      completionPercentage: result.completionPercentage,
      message: 'Contribution successful'
    }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/council/quests') {
    const membership = await env.DB.prepare('SELECT council_id FROM council_members WHERE user_id = ?').bind(userId).first<{ council_id: string }>();
    if (!membership) {
      return jsonResponse({ error: 'Join a guild to see quests' }, 403, corsHeaders);
    }
    const council = await env.DB.prepare('SELECT guild_code FROM councils WHERE id = ?').bind(membership.council_id).first<{ guild_code: string | null }>();
    if (!council?.guild_code) {
      return jsonResponse({ quests: [] }, 200, corsHeaders);
    }
    const quests = await env.DB.prepare('SELECT * FROM guild_quests WHERE guild_code = ? AND is_active = 1').bind(council.guild_code).all();
    const progressRows = await env.DB.prepare('SELECT * FROM guild_quest_progress WHERE user_id = ?').bind(userId).all();
    const progressMap: Record<string, any> = {};
    for (const row of progressRows.results as any[]) {
      progressMap[row.quest_id] = row;
    }
    const formatted = (quests.results as any[]).map((quest) => ({
      id: quest.id,
      guildCode: quest.guild_code,
      title: quest.title,
      description: quest.description,
      requirement: JSON.parse(quest.requirement_json || '{}'),
      reward: JSON.parse(quest.reward_json || '{}'),
      status: progressMap[quest.id]?.status || 'active',
      progress: progressMap[quest.id]?.progress || 0,
    }));
    return jsonResponse({ quests: formatted }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/quests/contribute') {
    const body = await request.json() as { questId: string; amount?: number };
    if (!body.questId) {
      return jsonResponse({ error: 'questId required' }, 400, corsHeaders);
    }
    const membership = await env.DB.prepare('SELECT council_id FROM council_members WHERE user_id = ?').bind(userId).first<{ council_id: string }>();
    if (!membership) {
      return jsonResponse({ error: 'Join a guild to contribute' }, 403, corsHeaders);
    }
    const council = await env.DB.prepare('SELECT guild_code FROM councils WHERE id = ?').bind(membership.council_id).first<{ guild_code: string | null }>();
    if (!council?.guild_code) {
      return jsonResponse({ error: 'Council is not aligned to a guild archetype yet' }, 400, corsHeaders);
    }
    const city = await getCityForUser(env.DB, userId);
    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }
    const quest = await env.DB.prepare('SELECT * FROM guild_quests WHERE id = ?').bind(body.questId).first<{ guild_code: string; requirement_json: string; reward_json: string }>();
    if (!quest || quest.guild_code !== council.guild_code) {
      return jsonResponse({ error: 'Quest not found for your guild' }, 404, corsHeaders);
    }
    const requirement = JSON.parse(quest.requirement_json || '{}');
    if (!requirement.resource || !requirement.amount) {
      return jsonResponse({ error: 'Quest configuration invalid' }, 500, corsHeaders);
    }
    const resource = await env.DB.prepare(
      `SELECT cr.amount, r.id as resource_id FROM city_resources cr
       JOIN resources r ON cr.resource_id = r.id
       WHERE cr.city_id = ? AND r.code = ?`
    )
      .bind(city.id, requirement.resource)
      .first<{ amount: number; resource_id: string }>();
    const contribution = Math.min(requirement.amount, Math.max(0, body.amount || requirement.amount));
    if (!resource || resource.amount < contribution) {
      return jsonResponse({ error: 'Insufficient resources' }, 400, corsHeaders);
    }
    let progress = await env.DB.prepare('SELECT * FROM guild_quest_progress WHERE quest_id = ? AND user_id = ?')
      .bind(body.questId, userId)
      .first<{ id: string; progress: number; status: string }>();
    if (progress && progress.status === 'claimed') {
      return jsonResponse({ error: 'Quest already claimed' }, 400, corsHeaders);
    }
    const target = requirement.amount;
    const currentProgress = progress ? progress.progress : 0;
    if (currentProgress >= target) {
      return jsonResponse({ error: 'Quest already completed' }, 400, corsHeaders);
    }
    const allowableContribution = Math.min(contribution, target - currentProgress);
    await env.DB.prepare('UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?')
      .bind(allowableContribution, city.id, resource.resource_id)
      .run();
    if (progress) {
      await env.DB.prepare('UPDATE guild_quest_progress SET progress = progress + ?, status = ?, updated_at = ? WHERE id = ?')
        .bind(
          allowableContribution,
          currentProgress + allowableContribution >= target ? 'claimed' : 'active',
          Date.now(),
          progress.id
        )
        .run();
    } else {
      await env.DB.prepare('INSERT INTO guild_quest_progress (id, quest_id, user_id, progress, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(
          crypto.randomUUID(),
          body.questId,
          userId,
          allowableContribution,
          allowableContribution >= target ? 'claimed' : 'active',
          Date.now()
        )
        .run();
      progress = await env.DB.prepare('SELECT * FROM guild_quest_progress WHERE quest_id = ? AND user_id = ?')
        .bind(body.questId, userId)
        .first();
    }
    if ((progress?.progress || 0) >= target) {
      await grantGuildRewards(env, userId, city.id, JSON.parse(quest.reward_json || '{}'));
    }
    return jsonResponse({ success: true, progress: Math.min(target, (progress?.progress || 0)), target }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/council/treasury/withdraw') {
    const body = await request.json() as { amount: number };

    if (!body.amount || body.amount <= 0) {
      return jsonResponse({ error: 'Invalid withdrawal amount' }, 400, corsHeaders);
    }

    // Verify user is steward
    const city = await env.DB.prepare(
      'SELECT region_id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ region_id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    const council = await env.DB.prepare(
      `SELECT c.* FROM councils c
       WHERE c.region_id = ? AND c.steward_user_id = ?`
    )
      .bind(city.region_id, userId)
      .first<{ id: string; treasury_balance: number }>();

    if (!council) {
      return jsonResponse({ error: 'Not authorized. Only stewards can withdraw from treasury.' }, 403, corsHeaders);
    }

    const currentBalance = council.treasury_balance || 0;
    if (currentBalance < body.amount) {
      return jsonResponse({ 
        error: `Insufficient treasury balance. Available: ${currentBalance}` 
      }, 400, corsHeaders);
    }

    // Withdraw to steward's city
    const coinsResource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind('COINS')
      .first<{ id: string }>();

    if (!coinsResource) {
      return jsonResponse({ error: 'COINS resource not found' }, 500, corsHeaders);
    }

    const userCity = await env.DB.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!userCity) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    // Update treasury balance
    const newBalance = currentBalance - body.amount;
    await env.DB.prepare(
      'UPDATE councils SET treasury_balance = ? WHERE id = ?'
    )
      .bind(newBalance, council.id)
      .run()
      .catch((error) => {
        console.warn('Council treasury_balance column not found. Run migration 0004_council_treasury.sql:', error);
        throw error;
      });

    // Add coins to steward's city
    const currentCoins = await env.DB.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    )
      .bind(userCity.id, coinsResource.id)
      .first<{ amount: number }>();

    const currentAmount = Math.max(0, currentCoins?.amount || 0);
    const newAmount = currentAmount + body.amount;

    await env.DB.prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
    )
      .bind(userCity.id, coinsResource.id, newAmount, 0, newAmount)
      .run();

    return jsonResponse({
      success: true,
      newBalance,
      withdrawn: body.amount,
      message: 'Withdrawal successful'
    }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}
