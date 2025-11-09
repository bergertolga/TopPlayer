import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';
import { ArmyManager } from '../../game/army';

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-ID',
};

export async function handleArmy(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  let userId: string;
  
  try {
    userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID') || '');
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400, corsHeaders);
  }

  // Get city for user
  const city = await env.DB.prepare(
    'SELECT id FROM cities WHERE user_id = ?'
  )
    .bind(userId)
    .first<{ id: string }>();

  if (!city) {
    return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
  }

  // GET /api/v1/army/troop-types - List all troop types
  if (request.method === 'GET' && url.pathname === '/api/v1/army/troop-types') {
    const troopTypes = await env.DB.prepare(
      'SELECT * FROM troop_types ORDER BY category, base_power'
    )
      .all();

    const formatted = troopTypes.results.map((t: any) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      category: t.category,
      basePower: t.base_power,
      baseCostCoins: t.base_cost_coins,
      baseCostResources: JSON.parse(t.base_cost_resources_json || '{}'),
      upkeepCoins: t.upkeep_coins,
      trainingTimeSeconds: t.training_time_seconds,
      maxLevel: t.max_level,
      description: t.description,
    }));

    return jsonResponse({ troopTypes: formatted }, 200, corsHeaders);
  }

  // GET /api/v1/army/troops - Get city troops
  if (request.method === 'GET' && url.pathname === '/api/v1/army/troops') {
    const troops = await env.DB.prepare(
      `SELECT ct.*, tt.code, tt.name, tt.category, tt.base_power, tt.upkeep_coins
       FROM city_troops ct
       JOIN troop_types tt ON ct.troop_type_id = tt.id
       WHERE ct.city_id = ? AND ct.quantity > 0
       ORDER BY tt.category, tt.base_power`
    )
      .bind(city.id)
      .all();

    const formatted = troops.results.map((t: any) => ({
      id: t.id,
      troopTypeId: t.troop_type_id,
      troopCode: t.code,
      troopName: t.name,
      category: t.category,
      quantity: t.quantity,
      level: t.level,
      experience: t.experience,
      basePower: t.base_power,
      totalPower: ArmyManager.calculateTroopPower(t.base_power, t.quantity, t.level),
      upkeepCoins: t.upkeep_coins * t.quantity,
    }));

    return jsonResponse({ troops: formatted }, 200, corsHeaders);
  }

  // POST /api/v1/army/train - Train troops
  if (request.method === 'POST' && url.pathname === '/api/v1/army/train') {
    const body = await request.json() as { troopTypeId: string; quantity: number };
    
    const troopType = await env.DB.prepare(
      'SELECT * FROM troop_types WHERE id = ?'
    )
      .bind(body.troopTypeId)
      .first<{
        base_cost_coins: number;
        base_cost_resources_json: string;
        base_power: number;
      }>();

    if (!troopType) {
      return jsonResponse({ error: 'Troop type not found' }, 404, corsHeaders);
    }

    const costResources = JSON.parse(troopType.base_cost_resources_json || '{}');
    
    // Check if city has required resources
    const coinsResource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind('COINS')
      .first<{ id: string }>();

    if (coinsResource) {
      const cityCoins = await env.DB.prepare(
        'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
      )
        .bind(city.id, coinsResource.id)
        .first<{ amount: number }>();

      const totalCost = troopType.base_cost_coins * body.quantity;
      if (!cityCoins || cityCoins.amount < totalCost) {
        return jsonResponse({ error: 'Insufficient coins' }, 400, corsHeaders);
      }

      // Deduct coins
      await env.DB.prepare(
        'UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?'
      )
        .bind(totalCost, city.id, coinsResource.id)
        .run();
    }

    // Check and deduct other resources
    for (const [resourceCode, amount] of Object.entries(costResources)) {
      const resource = await env.DB.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind(resourceCode)
        .first<{ id: string }>();

      if (resource) {
        const cityResource = await env.DB.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        )
          .bind(city.id, resource.id)
          .first<{ amount: number }>();

        const totalNeeded = (amount as number) * body.quantity;
        if (!cityResource || cityResource.amount < totalNeeded) {
          return jsonResponse({ error: `Insufficient ${resourceCode}` }, 400, corsHeaders);
        }

        await env.DB.prepare(
          'UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?'
        )
          .bind(totalNeeded, city.id, resource.id)
          .run();
      }
    }

    // Add troops
    const existingTroop = await env.DB.prepare(
      'SELECT * FROM city_troops WHERE city_id = ? AND troop_type_id = ?'
    )
      .bind(city.id, body.troopTypeId)
      .first<{ id: string; quantity: number }>();

    if (existingTroop) {
      await env.DB.prepare(
        'UPDATE city_troops SET quantity = quantity + ? WHERE id = ?'
      )
        .bind(body.quantity, existingTroop.id)
        .run();
    } else {
      const troopId = `troop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(
        'INSERT INTO city_troops (id, city_id, troop_type_id, quantity, level, experience, created_at) VALUES (?, ?, ?, ?, 1, 0, ?)'
      )
        .bind(troopId, city.id, body.troopTypeId, body.quantity, Date.now())
        .run();
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  // GET /api/v1/army/formations - Get army formations
  if (request.method === 'GET' && url.pathname === '/api/v1/army/formations') {
    const formations = await env.DB.prepare(
      'SELECT * FROM army_formations WHERE city_id = ? ORDER BY is_active DESC, created_at DESC'
    )
      .bind(city.id)
      .all();

    const formatted = formations.results.map((f: any) => ({
      id: f.id,
      name: f.name,
      troopQuantities: JSON.parse(f.troop_quantities_json || '{}'),
      totalPower: f.total_power,
      isActive: f.is_active === 1,
    }));

    return jsonResponse({ formations: formatted }, 200, corsHeaders);
  }

  // POST /api/v1/army/formation - Create/update formation
  if (request.method === 'POST' && url.pathname === '/api/v1/army/formation') {
    const body = await request.json() as { 
      formationId?: string; 
      name: string; 
      troopQuantities: Record<string, number> 
    };

    // Validate troops exist and calculate power
    let totalPower = 0;
    for (const [troopTypeId, quantity] of Object.entries(body.troopQuantities)) {
      if (quantity <= 0) continue;

      const troop = await env.DB.prepare(
        `SELECT ct.quantity, ct.level, tt.base_power
         FROM city_troops ct
         JOIN troop_types tt ON ct.troop_type_id = tt.id
         WHERE ct.city_id = ? AND ct.troop_type_id = ?`
      )
        .bind(city.id, troopTypeId)
        .first<{ quantity: number; level: number; base_power: number }>();

      if (!troop || troop.quantity < quantity) {
        return jsonResponse({ error: `Insufficient troops for ${troopTypeId}` }, 400, corsHeaders);
      }

      totalPower += ArmyManager.calculateTroopPower(troop.base_power, quantity, troop.level);
    }

    if (body.formationId) {
      // Update existing
      await env.DB.prepare(
        'UPDATE army_formations SET name = ?, troop_quantities_json = ?, total_power = ? WHERE id = ? AND city_id = ?'
      )
        .bind(body.name, JSON.stringify(body.troopQuantities), totalPower, body.formationId, city.id)
        .run();
    } else {
      // Create new
      const formationId = `formation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(
        'INSERT INTO army_formations (id, city_id, name, troop_quantities_json, total_power, is_active, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
      )
        .bind(formationId, city.id, body.name, JSON.stringify(body.troopQuantities), totalPower, Date.now())
        .run();
    }

    return jsonResponse({ success: true, totalPower }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

