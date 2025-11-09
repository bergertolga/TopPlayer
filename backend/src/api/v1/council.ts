import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';

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

  if (request.method === 'POST' && url.pathname === '/api/v1/council/create') {
    const body = await request.json() as { name: string };

    if (!body.name || body.name.length < 3 || body.name.length > 30) {
      return jsonResponse({ error: 'Council name must be 3-30 characters' }, 400, corsHeaders);
    }

    
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

    
    const existing = await env.DB.prepare(
      'SELECT id FROM councils WHERE region_id = ? LIMIT 1'
    )
      .bind(city.region_id)
      .first();

    if (existing) {
      return jsonResponse({ error: 'Council already exists in this region' }, 409, corsHeaders);
    }

    
    const councilId = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO councils (id, name, steward_user_id, region_id, tax_rate, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(councilId, body.name, userId, city.region_id, 0.01, Date.now())
      .run();

    
    await env.DB.prepare(
      'INSERT INTO council_members (council_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)'
    )
      .bind(councilId, userId, 'steward', Date.now())
      .run();

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

    return jsonResponse({ success: true }, 200, corsHeaders);
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

    const council = await env.DB.prepare(
      `SELECT c.*, u.username as steward_name, 
              COALESCE(c.treasury_balance, 0) as treasury_balance
       FROM councils c
       JOIN users u ON c.steward_user_id = u.id
       WHERE c.region_id = ?`
    )
      .bind(city.region_id)
      .first();

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

    return jsonResponse({
      council,
      members: members.results,
      publicWorks: publicWorks.results,
    }, 200, corsHeaders);
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
