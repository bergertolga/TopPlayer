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

export async function handlePve(
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

  if (request.method === 'GET' && url.pathname === '/api/v1/pve/nodes') {
    const regionId = url.searchParams.get('regionId');

    let query = `SELECT * FROM pve_nodes WHERE status = 'active'`;
    let params: any[] = [];

    if (regionId) {
      query += ' AND region_id = ?';
      params.push(regionId);
    }

    const nodes = await env.DB.prepare(query)
      .bind(...params)
      .all();

    return jsonResponse({ nodes: nodes.results }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/pve/attack') {
    let userId: string;
    try {
      userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400, corsHeaders);
    }

    const body = await request.json() as { nodeId: string };

    
    const node = await env.DB.prepare(
      'SELECT * FROM pve_nodes WHERE id = ? AND status = ?'
    )
      .bind(body.nodeId, 'active')
      .first();

    if (!node) {
      return jsonResponse({ error: 'Node not found or not available' }, 404, corsHeaders);
    }

    
    const city = await env.DB.prepare(
      'SELECT id, level, population FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; level: number; population: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 7) {
      return jsonResponse({ error: 'PvE unlocks at city level 7' }, 403, corsHeaders);
    }

    
    const buildings = await env.DB.prepare(
      `SELECT cb.level, b.category 
       FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND cb.is_active = 1`
    )
      .bind(city.id)
      .all() as { results: Array<{ level: number; category: string }> };

    let buildingPower = 0;
    for (const building of buildings.results) {
      
      if (building.category === 'military') {
        buildingPower += building.level * 20;
      } else {
        buildingPower += building.level * 5;
      }
    }

    const cityPower = (city.level * 50) + (city.population * 0.5) + buildingPower;
    const nodePower = (node as any).power_required || 100;

    
    const powerRatio = cityPower / nodePower;
    let victoryChance = Math.min(0.95, 0.5 + (powerRatio - 1) * 0.3); 

    
    const victoryRoll = Math.random();
    const victory = victoryRoll < victoryChance;

    if (!victory) {
      
      const consolationReward = Math.floor(nodePower * 0.1);
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
        const newAmount = Math.max(0, currentAmount + consolationReward);
        
        await env.DB.prepare(
          `INSERT INTO city_resources (city_id, resource_id, amount, protected)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
        )
          .bind(city.id, coinsResource.id, newAmount, 0, newAmount)
          .run();
      }

      return jsonResponse({
        success: false,
        victory: false,
        cityPower: Math.round(cityPower),
        nodePower,
        victoryChance: Math.round(victoryChance * 100),
        consolationReward: { COINS: consolationReward },
        message: 'Your forces were defeated. Better luck next time!',
      }, 200, corsHeaders);
    }

    
    const rewards = JSON.parse((node as any).reward_json || '{}');
    const grantedRewards: Record<string, number> = {};

    
    for (const [resourceCode, rewardData] of Object.entries(rewards)) {
      if (typeof rewardData === 'object' && rewardData !== null && 'chance' in rewardData) {
        const chanceData = rewardData as { amount: number; chance: number };
        if (Math.random() < chanceData.chance) {
          grantedRewards[resourceCode] = chanceData.amount;
        }
      } else if (typeof rewardData === 'number') {
        grantedRewards[resourceCode] = rewardData;
      }
    }

    
    for (const [resourceCode, amount] of Object.entries(grantedRewards)) {
      const resource = await env.DB.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind(resourceCode)
        .first<{ id: string }>();

      if (resource) {
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

    
    const respawnAt = Date.now() + (60 * 60 * 1000); 
    await env.DB.prepare(
      'UPDATE pve_nodes SET status = ?, respawn_at = ? WHERE id = ?'
    )
      .bind('defeated', respawnAt, body.nodeId)
      .run();

    
    const progressId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO user_pve_progress (id, user_id, node_id, defeated_at, times_defeated)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, node_id) DO UPDATE SET 
         defeated_at = ?,
         times_defeated = times_defeated + 1`
    )
      .bind(progressId, userId, body.nodeId, Date.now(), 1, Date.now())
      .run();

    return jsonResponse({
      success: true,
      victory: true,
      cityPower: Math.round(cityPower),
      nodePower,
      victoryChance: Math.round(victoryChance * 100),
      rewards: grantedRewards,
      message: 'Victory! Resources secured.',
    }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}
