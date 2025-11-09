import { Env } from '../../types';
import { CityManager } from '../../game/city';
import { validateUserId } from '../../utils/validation';
import { MilestoneSystem } from '../../game/milestones';

export async function syncTotalCurrency(db: D1Database, userId: string): Promise<void> {
  const city = await db.prepare(
    'SELECT id FROM cities WHERE user_id = ?'
  )
    .bind(userId)
    .first<{ id: string }>();

  if (!city) {
    return;
  }

  const coinsResource = await db.prepare(
    'SELECT id FROM resources WHERE code = ?'
  )
    .bind('COINS')
    .first<{ id: string }>();

  if (!coinsResource) {
    return;
  }

  const cityCoins = await db.prepare(
    'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
  )
    .bind(city.id, coinsResource.id)
    .first<{ amount: number }>();

  const totalCoins = Math.max(0, cityCoins?.amount || 0);

  await db.prepare(
    'UPDATE user_progress SET total_currency = ? WHERE user_id = ?'
  )
    .bind(totalCoins, userId)
    .run();
}

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

export async function handleCity(
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

  if (request.method === 'GET' && url.pathname === '/api/v1/city') {
    await syncTotalCurrency(env.DB, userId);
    
    let city = await env.DB.prepare(
      `SELECT c.*, r.name as region_name FROM cities c
       JOIN regions r ON c.region_id = r.id
       WHERE c.user_id = ?`
    )
      .bind(userId)
      .first();

    
    if (!city) {
      const region = await env.DB.prepare(
        'SELECT id FROM regions WHERE id = ? OR name = ? LIMIT 1'
      )
        .bind('region-heartlands', 'Heartlands')
        .first<{ id: string }>();

      if (region) {
        const now = Date.now();
        const cityId = crypto.randomUUID();
        
        
        const user = await env.DB.prepare(
          'SELECT username FROM users WHERE id = ?'
        )
          .bind(userId)
          .first<{ username: string }>();
        
        const cityName = user ? `${user.username}'s City` : 'New City';
        
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

        
        city = await env.DB.prepare(
          `SELECT c.*, r.name as region_name FROM cities c
           JOIN regions r ON c.region_id = r.id
           WHERE c.user_id = ?`
        )
          .bind(userId)
          .first();
      }
    }

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    
    const resources = await env.DB.prepare(
      `SELECT r.code, r.name, r.type, cr.amount, cr.protected
       FROM city_resources cr
       JOIN resources r ON cr.resource_id = r.id
       WHERE cr.city_id = ?`
    )
      .bind(city.id)
      .all();

    
    const buildings = await env.DB.prepare(
      `SELECT b.code, b.name, b.category, cb.level, cb.workers, cb.is_active
       FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ?`
    )
      .bind(city.id)
      .all();

    
    const governors = await env.DB.prepare(
      `SELECT cg.governor_id, g.code, g.name, g.rarity, cg.slot, cg.assigned_building_id
       FROM city_governors cg
       JOIN governors g ON cg.governor_id = g.id
       WHERE cg.city_id = ?`
    )
      .bind(city.id)
      .all();

    
    const buildingsWithProduction = await Promise.all(
      buildings.results.map(async (building: any) => {
        const buildingDef = await env.DB.prepare(
          'SELECT base_production_json, input_resources_json, output_resources_json FROM buildings WHERE code = ?'
        )
          .bind(building.code)
          .first<{ base_production_json: string; input_resources_json: string; output_resources_json: string }>();

        if (!buildingDef) return building;

        const baseProduction = JSON.parse(buildingDef.base_production_json || '{}');
        const inputResources = JSON.parse(buildingDef.input_resources_json || '{}');
        const outputResources = JSON.parse(buildingDef.output_resources_json || '{}');

        
        const productionRate: Record<string, number> = {};
        const consumptionRate: Record<string, number> = {};
        const outputRate: Record<string, number> = {};

        
        const region = await env.DB.prepare(
          'SELECT * FROM regions WHERE id = ?'
        )
          .bind((city as any).region_id)
          .first<{
            wood_bias: number;
            ore_bias: number;
            food_bias: number;
            stone_bias: number;
            fiber_bias: number;
            clay_bias: number;
          }>();

        const regionBias: Record<string, number> = {
          WOOD: region?.wood_bias || 1.0,
          ORE: region?.ore_bias || 1.0,
          FOOD: region?.food_bias || 1.0,
          STONE: region?.stone_bias || 1.0,
          FIBER: region?.fiber_bias || 1.0,
          CLAY: region?.clay_bias || 1.0,
        };

        
        if (Object.keys(baseProduction).length > 0) {
          const production = CityManager.calculateProduction(
            baseProduction,
            building.level,
            {
              regionBias,
              happiness: (city as any).happiness,
            }
          );
          Object.assign(productionRate, production);
        }

        
        if (Object.keys(inputResources).length > 0) {
          Object.assign(consumptionRate, inputResources);
          const efficiency = 0.9 + (0.02 * (building.level - 1));
          for (const [resource, baseOutput] of Object.entries(outputResources)) {
            outputRate[resource] = Math.floor((baseOutput as number) * efficiency);
          }
        }

        return {
          ...building,
          productionRate,
          consumptionRate,
          outputRate,
        };
      })
    );

    
    const totalProduction: Record<string, number> = {};
    const totalConsumption: Record<string, number> = {};
    const populationConsumption = CityManager.calculateConsumption((city as any).population);

    for (const building of buildingsWithProduction) {
      if ((building as any).productionRate) {
        for (const [resource, rate] of Object.entries((building as any).productionRate)) {
          totalProduction[resource] = (totalProduction[resource] || 0) + (rate as number);
        }
      }
      if ((building as any).consumptionRate) {
        for (const [resource, rate] of Object.entries((building as any).consumptionRate)) {
          totalConsumption[resource] = (totalConsumption[resource] || 0) + (rate as number);
        }
      }
      if ((building as any).outputRate) {
        for (const [resource, rate] of Object.entries((building as any).outputRate)) {
          totalProduction[resource] = (totalProduction[resource] || 0) + (rate as number);
        }
      }
    }

    
    for (const [resource, rate] of Object.entries(populationConsumption)) {
      totalConsumption[resource] = (totalConsumption[resource] || 0) + rate;
    }

    
    const warehouse = buildingsWithProduction.find((b: any) => b.code === 'WAREHOUSE');
    const warehouseLevel = warehouse?.level || 1;
    const warehouseCapacity = CityManager.calculateWarehouseCapacity(warehouseLevel);

    
    const netProduction: Record<string, number> = {};
    const allResources = new Set([...Object.keys(totalProduction), ...Object.keys(totalConsumption)]);
    for (const resource of allResources) {
      netProduction[resource] = (totalProduction[resource] || 0) - (totalConsumption[resource] || 0);
    }

    // Process production for all buildings and get storage info
    const { BuildingProductionManager } = await import('../../game/building-production');
    const currentTime = Date.now();
    
    // Process production for all active buildings
    for (const building of buildings.results as any[]) {
      if (building.is_active === 1 && building.building_id) {
        await BuildingProductionManager.processBuildingProduction(
          env.DB,
          String(city.id),
          String(building.building_id),
          currentTime
        );
      }
    }

    // Reload buildings with updated storage
    const buildingsWithStorage = await env.DB.prepare(
      `SELECT cb.*, b.code, b.name, b.category, b.base_production_json, 
              b.input_resources_json, b.output_resources_json, b.upkeep_coins, 
              b.max_level, cb.storage_json, cb.storage_capacity, cb.last_production
       FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ?`
    )
      .bind(city.id)
      .all();

    // Calculate upgrade costs and add storage info
    const buildingsWithCosts = await Promise.all(
      buildingsWithStorage.results.map(async (building: any) => {
        const buildingDef = await env.DB.prepare(
          'SELECT upkeep_coins, max_level FROM buildings WHERE code = ?'
        )
          .bind(building.code)
          .first<{ upkeep_coins: number; max_level: number }>();

        if (!buildingDef) return building;

        const currentLevel = building.level || 1;
        const costMultiplier = Math.pow(1.5, currentLevel - 1);
        const upgradeCost = Math.floor(buildingDef.upkeep_coins * 10 * costMultiplier);
        const canUpgrade = currentLevel < buildingDef.max_level;
        
        const storage: Record<string, number> = JSON.parse(building.storage_json || '{}');
        const storageCapacity = building.storage_capacity || BuildingProductionManager.calculateBuildingStorageCapacity(currentLevel);
        const storageUsed = Object.values(storage).reduce((sum, val) => sum + val, 0);
        const storagePercent = storageCapacity > 0 ? storageUsed / storageCapacity : 0;

        // Calculate production rates for display
        const baseProduction = JSON.parse(building.base_production_json || '{}');
        const productionRate: Record<string, number> = {};
        const inputResources = JSON.parse(building.input_resources_json || '{}');
        const outputResources = JSON.parse(building.output_resources_json || '{}');
        const consumptionRate: Record<string, number> = {};
        const outputRate: Record<string, number> = {};

        if (Object.keys(baseProduction).length > 0) {
          // Re-fetch region bias for this building
          const buildingRegion = await env.DB.prepare(
            'SELECT * FROM regions WHERE id = ?'
          )
            .bind((city as any).region_id)
            .first<{
              wood_bias: number;
              ore_bias: number;
              food_bias: number;
              stone_bias: number;
              fiber_bias: number;
              clay_bias: number;
            }>();

          const buildingRegionBias: Record<string, number> = {
            WOOD: buildingRegion?.wood_bias || 1.0,
            ORE: buildingRegion?.ore_bias || 1.0,
            FOOD: buildingRegion?.food_bias || 1.0,
            STONE: buildingRegion?.stone_bias || 1.0,
            FIBER: buildingRegion?.fiber_bias || 1.0,
            CLAY: buildingRegion?.clay_bias || 1.0,
          };

          const production = CityManager.calculateProduction(
            baseProduction,
            building.level,
            {
              regionBias: buildingRegionBias,
              happiness: (city as any).happiness,
            }
          );
          Object.assign(productionRate, production);
        }

        if (Object.keys(inputResources).length > 0) {
          Object.assign(consumptionRate, inputResources);
          const efficiency = 0.9 + (0.02 * (building.level - 1));
          for (const [resource, baseOutput] of Object.entries(outputResources)) {
            outputRate[resource] = Math.floor((baseOutput as number) * efficiency);
          }
        }

        return {
          ...building,
          upgradeCost,
          canUpgrade,
          maxLevel: buildingDef.max_level,
          storage,
          storageCapacity,
          storageUsed,
          storagePercent,
          productionRate,
          consumptionRate,
          outputRate,
        };
      })
    );

    return jsonResponse({
      city,
      resources: resources.results,
      buildings: buildingsWithCosts,
      governors: governors.results,
      production: {
        rates: totalProduction,
        consumption: totalConsumption,
        net: netProduction,
      },
      warehouse: {
        capacity: warehouseCapacity,
        level: warehouseLevel,
      },
      population: {
        consumption: populationConsumption,
      },
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/city/rename') {
    const body = await request.json() as { name: string };
    
    if (!body.name || body.name.length < 3 || body.name.length > 30) {
      return jsonResponse({ error: 'City name must be 3-30 characters' }, 400, corsHeaders);
    }

    await env.DB.prepare(
      'UPDATE cities SET name = ? WHERE user_id = ?'
    )
      .bind(body.name, userId)
      .run();

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/city/level-up') {
    
    const city = await env.DB.prepare(
      'SELECT * FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; level: number; population: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    
    const costMultiplier = Math.pow(1.5, city.level - 1);
    const coinsCost = Math.floor(1000 * costMultiplier);
    const woodCost = Math.floor(500 * costMultiplier);
    const stoneCost = Math.floor(500 * costMultiplier);

    
    const coins = await env.DB.prepare(
      `SELECT cr.amount FROM city_resources cr
       JOIN resources r ON cr.resource_id = r.id
       WHERE cr.city_id = ? AND r.code = 'COINS'`
    )
      .bind(city.id)
      .first<{ amount: number }>();

    const wood = await env.DB.prepare(
      `SELECT cr.amount FROM city_resources cr
       JOIN resources r ON cr.resource_id = r.id
       WHERE cr.city_id = ? AND r.code = 'WOOD'`
    )
      .bind(city.id)
      .first<{ amount: number }>();

    const stone = await env.DB.prepare(
      `SELECT cr.amount FROM city_resources cr
       JOIN resources r ON cr.resource_id = r.id
       WHERE cr.city_id = ? AND r.code = 'STONE'`
    )
      .bind(city.id)
      .first<{ amount: number }>();

    if (!coins || coins.amount < coinsCost || !wood || wood.amount < woodCost || !stone || stone.amount < stoneCost) {
      return jsonResponse({ 
        error: 'Insufficient resources',
        required: { COINS: coinsCost, WOOD: woodCost, STONE: stoneCost }
      }, 400, corsHeaders);
    }

    
    const coinsResource = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind('COINS').first<{ id: string }>();
    const woodResource = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind('WOOD').first<{ id: string }>();
    const stoneResource = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind('STONE').first<{ id: string }>();

    if (coinsResource) {
      const currentCoins = await env.DB.prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, coinsResource.id).first<{ amount: number }>();
      const newCoins = Math.max(0, (currentCoins?.amount || 0) - coinsCost);
      await env.DB.prepare('UPDATE city_resources SET amount = ? WHERE city_id = ? AND resource_id = ?')
        .bind(newCoins, city.id, coinsResource.id).run();
    }
    if (woodResource) {
      const currentWood = await env.DB.prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, woodResource.id).first<{ amount: number }>();
      const newWood = Math.max(0, (currentWood?.amount || 0) - woodCost);
      await env.DB.prepare('UPDATE city_resources SET amount = ? WHERE city_id = ? AND resource_id = ?')
        .bind(newWood, city.id, woodResource.id).run();
    }
    if (stoneResource) {
      const currentStone = await env.DB.prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
        .bind(city.id, stoneResource.id).first<{ amount: number }>();
      const newStone = Math.max(0, (currentStone?.amount || 0) - stoneCost);
      await env.DB.prepare('UPDATE city_resources SET amount = ? WHERE city_id = ? AND resource_id = ?')
        .bind(newStone, city.id, stoneResource.id).run();
    }

    
    const newLevel = city.level + 1;
    const newPopulation = Math.floor(city.population * 1.1); 

    await env.DB.prepare(
      'UPDATE cities SET level = ?, population = ? WHERE id = ?'
    )
      .bind(newLevel, newPopulation, city.id)
      .run();

    await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'city_level_5', newLevel);
    await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'city_level_10', newLevel);
    await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'city_level_15', newLevel);

    return jsonResponse({ 
      success: true, 
      newLevel,
      newPopulation,
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/city/upgrade') {
    const body = await request.json() as { buildingCode: string };
    
    
    const building = await env.DB.prepare(
      'SELECT * FROM buildings WHERE code = ?'
    )
      .bind(body.buildingCode)
      .first<{ id: string; max_level: number; upkeep_coins: number }>();

    if (!building) {
      return jsonResponse({ error: 'Building not found' }, 404, corsHeaders);
    }

    
    const city = await env.DB.prepare(
      'SELECT * FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    
    const cityBuilding = await env.DB.prepare(
      'SELECT * FROM city_buildings WHERE city_id = ? AND building_id = ?'
    )
      .bind(city.id, building.id)
      .first<{ level: number }>();

    const currentLevel = cityBuilding ? cityBuilding.level : 0;
    const newLevel = currentLevel + 1;

    if (newLevel > building.max_level) {
      return jsonResponse({ error: 'Building at max level' }, 400, corsHeaders);
    }

    
    const costMultiplier = Math.pow(1.5, currentLevel);
    const coinsCost = Math.floor(building.upkeep_coins * 10 * costMultiplier);

    
    const coins = await env.DB.prepare(
      `SELECT cr.amount FROM city_resources cr
       JOIN resources r ON cr.resource_id = r.id
       WHERE cr.city_id = ? AND r.code = 'COINS'`
    )
      .bind(city.id)
      .first<{ amount: number }>();

    if (!coins || coins.amount < coinsCost) {
      return jsonResponse({ error: 'Insufficient coins' }, 400, corsHeaders);
    }

    
    const coinsResource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind('COINS')
      .first<{ id: string }>();

    if (coinsResource) {
      const currentCoins = await env.DB.prepare(
        'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
      ).bind(city.id, coinsResource.id).first<{ amount: number }>();
      const newCoins = Math.max(0, (currentCoins?.amount || 0) - coinsCost);
      await env.DB.prepare(
        `UPDATE city_resources SET amount = ? 
         WHERE city_id = ? AND resource_id = ?`
      )
        .bind(newCoins, city.id, coinsResource.id)
        .run();
    }

    if (cityBuilding) {
      await env.DB.prepare(
        'UPDATE city_buildings SET level = ? WHERE city_id = ? AND building_id = ?'
      )
        .bind(newLevel, city.id, building.id)
        .run();
    } else {
      
      await env.DB.prepare(
        'INSERT INTO city_buildings (city_id, building_id, level, workers, is_active, last_production) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(city.id, building.id, newLevel, 0, 1, Date.now())
        .run();
    }

    if (body.buildingCode === 'WAREHOUSE') {
      await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'warehouse_level_5', newLevel);
      await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'warehouse_level_10', newLevel);
    }

    return jsonResponse({ success: true, newLevel }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/city/collect') {
    const body = await request.json() as { buildingId?: string };
    
    const city = await env.DB.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    const { BuildingProductionManager } = await import('../../game/building-production');
    
    if (body.buildingId) {
      // Collect from specific building
      const result = await BuildingProductionManager.collectFromBuilding(
        env.DB,
        city.id,
        body.buildingId
      );
      return jsonResponse(result, 200, corsHeaders);
    } else {
      // Collect from all buildings
      const result = await BuildingProductionManager.collectAllBuildings(env.DB, city.id);
      return jsonResponse(result, 200, corsHeaders);
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/city/governors/available') {
    // Get all governors that the user owns (for now, return all governors)
    // In a full implementation, you'd track which governors the user has acquired
    const governors = await env.DB.prepare(
      'SELECT * FROM governors ORDER BY rarity, name'
    )
      .all();

    return jsonResponse({ governors: governors.results }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/city/governor/assign') {
    const body = await request.json() as {
      governorId: string;
      slot: 'city' | 'building';
      buildingId?: string;
    };

    if (!body.governorId || !body.slot) {
      return jsonResponse({ error: 'Missing required fields' }, 400, corsHeaders);
    }

    if (body.slot === 'building' && !body.buildingId) {
      return jsonResponse({ error: 'buildingId required for building slot' }, 400, corsHeaders);
    }

    // Verify governor exists
    const governor = await env.DB.prepare(
      'SELECT * FROM governors WHERE id = ?'
    )
      .bind(body.governorId)
      .first();

    if (!governor) {
      return jsonResponse({ error: 'Governor not found' }, 404, corsHeaders);
    }

    // Get user's city
    const city = await env.DB.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    // Check if governor is already assigned to this city
    const existingAssignment = await env.DB.prepare(
      'SELECT * FROM city_governors WHERE city_id = ? AND governor_id = ?'
    )
      .bind(city.id, body.governorId)
      .first();

    if (existingAssignment) {
      return jsonResponse({ error: 'Governor is already assigned to this city' }, 400, corsHeaders);
    }

    // If assigning to building, verify building exists and belongs to city
    if (body.slot === 'building' && body.buildingId) {
      const building = await env.DB.prepare(
        `SELECT cb.* FROM city_buildings cb
         WHERE cb.city_id = ? AND cb.building_id = ?`
      )
        .bind(city.id, body.buildingId)
        .first();

      if (!building) {
        return jsonResponse({ error: 'Building not found or does not belong to your city' }, 404, corsHeaders);
      }
    }

    // Assign governor
    await env.DB.prepare(
      `INSERT INTO city_governors (city_id, governor_id, slot, assigned_building_id)
       VALUES (?, ?, ?, ?)`
    )
      .bind(
        city.id,
        body.governorId,
        body.slot,
        body.slot === 'building' ? body.buildingId : null
      )
      .run();

    return jsonResponse({
      success: true,
      message: 'Governor assigned successfully'
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/city/governor/unassign') {
    const body = await request.json() as { governorId: string };

    if (!body.governorId) {
      return jsonResponse({ error: 'Governor ID required' }, 400, corsHeaders);
    }

    // Get user's city
    const city = await env.DB.prepare(
      'SELECT id FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    // Verify governor is assigned to this city
    const assignment = await env.DB.prepare(
      'SELECT * FROM city_governors WHERE city_id = ? AND governor_id = ?'
    )
      .bind(city.id, body.governorId)
      .first();

    if (!assignment) {
      return jsonResponse({ error: 'Governor is not assigned to this city' }, 404, corsHeaders);
    }

    // Unassign governor
    await env.DB.prepare(
      'DELETE FROM city_governors WHERE city_id = ? AND governor_id = ?'
    )
      .bind(city.id, body.governorId)
      .run();

    return jsonResponse({
      success: true,
      message: 'Governor unassigned successfully'
    }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

