import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';
import { MilestoneSystem } from '../../game/milestones';
import { CityManager } from '../../game/city';

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

export async function handleRoutes(
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

  if (request.method === 'GET' && url.pathname === '/api/v1/routes/destinations') {
    
    const regionId = url.searchParams.get('regionId');

    if (!regionId) {
      return jsonResponse({ error: 'regionId required' }, 400, corsHeaders);
    }

    const city = await env.DB.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    const destinations = await env.DB.prepare(
      `SELECT c.id, c.name, c.level, u.username as owner_name
       FROM cities c
       JOIN users u ON c.user_id = u.id
       WHERE c.region_id = ? AND c.id != ?
       ORDER BY c.level DESC`
    )
      .bind(regionId, city.id)
      .all();

    return jsonResponse({ destinations: destinations.results }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/routes') {
    
    const city = await env.DB.prepare(
      'SELECT id, level FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; level: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 5) {
      return jsonResponse({ error: 'Routes unlock at city level 5' }, 403, corsHeaders);
    }

    await processRoutesForCity(env.DB, city.id);

    const routes = await env.DB.prepare(
      `SELECT r.*, res.code as resource_code, res.name as resource_name,
              fr.name as from_region_name, tr.name as to_region_name,
              dc.name as destination_city_name
       FROM routes r
       JOIN resources res ON r.resource_id = res.id
       JOIN regions fr ON r.from_region_id = fr.id
       JOIN regions tr ON r.to_region_id = tr.id
       LEFT JOIN cities dc ON r.destination_city_id = dc.id
       WHERE r.city_id = ? AND r.status != 'completed'
       ORDER BY r.next_departure ASC`
    )
      .bind(city.id)
      .all();

    return jsonResponse({ routes: routes.results }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/routes/create') {
    const body = await request.json() as {
      fromRegion: string;
      toRegion: string;
      resource: string;
      qtyPerTrip: number;
      destinationCityId?: string;
      repeats?: number; 
    };

    
    const city = await env.DB.prepare(
      'SELECT id, region_id, level FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; region_id: string; level: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 5) {
      return jsonResponse({ error: 'Routes unlock at city level 5' }, 403, corsHeaders);
    }

    
    const fromRegion = await env.DB.prepare(
      'SELECT id FROM regions WHERE id = ? OR name = ?'
    )
      .bind(body.fromRegion, body.fromRegion)
      .first<{ id: string }>();

    const toRegion = await env.DB.prepare(
      'SELECT id FROM regions WHERE id = ? OR name = ?'
    )
      .bind(body.toRegion, body.toRegion)
      .first<{ id: string }>();

    if (!fromRegion || !toRegion) {
      return jsonResponse({ error: 'Invalid region' }, 400, corsHeaders);
    }

    // Validate destination is different from origin
    if (fromRegion.id === toRegion.id) {
      return jsonResponse({ error: 'Destination region must be different from origin region' }, 400, corsHeaders);
    }

    let destinationCityId: string;
    if (body.destinationCityId?.trim()) {
      const destinationCity = await env.DB.prepare(
        'SELECT id FROM cities WHERE id = ? AND region_id = ? AND id != ?'
      )
        .bind(body.destinationCityId.trim(), toRegion.id, city.id)
        .first<{ id: string }>();

      if (!destinationCity) {
        return jsonResponse({ error: 'Destination city not found in target region' }, 400, corsHeaders);
      }

      destinationCityId = destinationCity.id;
    } else {
      const fallbackDestination = await env.DB.prepare(
        'SELECT id FROM cities WHERE region_id = ? AND id != ? LIMIT 1'
      )
        .bind(toRegion.id, city.id)
        .first<{ id: string }>();

      if (!fallbackDestination) {
        return jsonResponse({ error: 'No destination city found in target region' }, 400, corsHeaders);
      }

      destinationCityId = fallbackDestination.id;
    }

    
    const resource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind(body.resource)
      .first<{ id: string }>();

    if (!resource) {
      return jsonResponse({ error: 'Resource not found' }, 404, corsHeaders);
    }

    
    const stock = await env.DB.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    )
      .bind(city.id, resource.id)
      .first<{ amount: number }>();

    if (!stock || stock.amount < body.qtyPerTrip) {
      return jsonResponse({ error: 'Insufficient resources' }, 400, corsHeaders);
    }

    // Check destination warehouse capacity
    const destinationWarehouse = await env.DB.prepare(
      `SELECT cb.level FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND b.code = 'WAREHOUSE' AND cb.is_active = 1`
    )
      .bind(destinationCityId)
      .first<{ level: number }>();

    const warehouseLevel = destinationWarehouse?.level || 1;
    const { CityManager } = await import('../../game/city');
    const warehouseCapacity = CityManager.calculateWarehouseCapacity(warehouseLevel);

    const destinationResources = await env.DB.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ?'
    )
      .bind(destinationCityId)
      .all<{ amount: number }>();

    let destinationTotalResources = 0;
    for (const res of destinationResources.results) {
      destinationTotalResources += Math.max(0, res.amount);
    }

    const availableCapacity = Math.max(0, warehouseCapacity - destinationTotalResources);
    if (availableCapacity < body.qtyPerTrip) {
      return jsonResponse({ 
        error: `Destination warehouse capacity insufficient. Available: ${Math.round(availableCapacity)}, Required: ${body.qtyPerTrip}` 
      }, 400, corsHeaders);
    }

    
    const cycleMinutes = 30;

    
    const routeId = crypto.randomUUID();
    const now = Date.now();
    const nextDeparture = now + (cycleMinutes * 60 * 1000);

    await env.DB.prepare(
      'INSERT INTO routes (id, city_id, from_region_id, to_region_id, destination_city_id, capacity, resource_id, qty_per_trip, cycle_minutes, escort_level, repeats, next_departure, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        routeId,
        city.id,
        fromRegion.id,
        toRegion.id,
        destinationCityId,
        body.qtyPerTrip,
        resource.id,
        body.qtyPerTrip,
        cycleMinutes,
        0,
        body.repeats ?? -1,
        nextDeparture,
        'active',
        now
      )
      .run();

    await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'first_route', 1);

    return jsonResponse({
      routeId,
      nextDeparture,
      status: 'active',
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/routes/cancel') {
    const body = await request.json() as { routeId: string };

    
    const route = await env.DB.prepare(
      `SELECT r.* FROM routes r
       JOIN cities c ON r.city_id = c.id
       WHERE r.id = ? AND c.user_id = ?`
    )
      .bind(body.routeId, userId)
      .first();

    if (!route) {
      return jsonResponse({ error: 'Route not found' }, 404, corsHeaders);
    }

    if ((route as any).status !== 'active') {
      return jsonResponse({ error: 'Route cannot be cancelled' }, 400, corsHeaders);
    }

    
    await env.DB.prepare(
      'UPDATE routes SET status = ? WHERE id = ?'
    )
      .bind('paused', body.routeId)
      .run();

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

export async function processRoutesForCity(db: D1Database, cityId: string): Promise<void> {
  const now = Date.now();
  const routes = await db.prepare(
    `SELECT r.*, res.id as resource_id, res.code as resource_code
     FROM routes r
     JOIN resources res ON r.resource_id = res.id
     WHERE r.city_id = ? AND r.status != 'completed'`
  )
    .bind(cityId)
    .all();

  for (const route of routes.results as any[]) {
    // process arrivals
    if (route.in_transit_qty > 0 && route.arrival_at && route.arrival_at <= now) {
      if (route.destination_city_id) {
        const warehouseRow = await db.prepare(
          `SELECT cb.level FROM city_buildings cb
           JOIN buildings b ON cb.building_id = b.id
           WHERE cb.city_id = ? AND b.code = 'WAREHOUSE' AND cb.is_active = 1`
        )
          .bind(route.destination_city_id)
          .first<{ level: number }>();

        const warehouseLevel = warehouseRow?.level || 1;
        const capacity = CityManager.calculateWarehouseCapacity(warehouseLevel);
        const destinationTotals = await db.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ?'
        )
          .bind(route.destination_city_id)
          .all<{ amount: number }>();

        let currentUsage = 0;
        for (const res of destinationTotals.results as any[]) {
          currentUsage += Math.max(0, res.amount);
        }

        const availableCapacity = Math.max(0, capacity - currentUsage);
        const deliverAmount = Math.min(route.in_transit_qty, availableCapacity);

        if (deliverAmount > 0) {
          await db.prepare(
            `INSERT INTO city_resources (city_id, resource_id, amount, protected)
             VALUES (?, ?, ?, 0)
             ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = amount + ?`
          )
            .bind(route.destination_city_id, route.resource_id, deliverAmount, deliverAmount)
            .run();
        }
      }

      let repeats = route.repeats;
      if (typeof repeats === 'number' && repeats > 0) {
        repeats -= 1;
      }
      let status = route.status;
      if (typeof repeats === 'number' && repeats === 0) {
        status = 'completed';
      }

      const nextDeparture =
        status === 'completed'
          ? route.next_departure
          : now + (route.cycle_minutes * 60 * 1000);

      await db.prepare(
        'UPDATE routes SET in_transit_qty = 0, arrival_at = 0, next_departure = ?, repeats = ?, status = ? WHERE id = ?'
      )
        .bind(nextDeparture, repeats, status, route.id)
        .run();

      route.in_transit_qty = 0;
      route.arrival_at = 0;
      route.next_departure = nextDeparture;
      route.repeats = repeats;
      route.status = status;
    }

    if (route.status !== 'active') {
      continue;
    }

    if (route.in_transit_qty <= 0 && route.next_departure <= now) {
      const stock = await db.prepare(
        'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
      )
        .bind(route.city_id, route.resource_id)
        .first<{ amount: number }>();

      if (!stock || stock.amount < route.qty_per_trip) {
        const delay = now + (10 * 60 * 1000);
        await db.prepare('UPDATE routes SET next_departure = ? WHERE id = ?')
          .bind(delay, route.id)
          .run();
        continue;
      }

      await db.prepare(
        'UPDATE city_resources SET amount = MAX(0, amount - ?) WHERE city_id = ? AND resource_id = ?'
      )
        .bind(route.qty_per_trip, route.city_id, route.resource_id)
        .run();

      const arrivalAt = now + (route.cycle_minutes * 60 * 1000);

      await db.prepare(
        'UPDATE routes SET in_transit_qty = ?, arrival_at = ?, next_departure = ? WHERE id = ?'
      )
        .bind(route.qty_per_trip, arrivalAt, arrivalAt, route.id)
        .run();
    }
  }
}
