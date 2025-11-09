import { CityManager } from './city';

const BUILDING_STORAGE_BASE = 1000;
const BUILDING_STORAGE_PER_LEVEL = 500;

export interface BuildingStorage {
  [resourceCode: string]: number;
}

export interface CollectResult {
  success: boolean;
  collected: Record<string, number>;
  buildingStorage: BuildingStorage;
  warehouseFull: boolean;
  error?: string;
}

export class BuildingProductionManager {
  static calculateBuildingStorageCapacity(level: number): number {
    return BUILDING_STORAGE_BASE + (BUILDING_STORAGE_PER_LEVEL * (level - 1));
  }

  static async processBuildingProduction(
    db: D1Database,
    cityId: string,
    buildingId: string,
    currentTime: number
  ): Promise<void> {
    const building = await db.prepare(
      `SELECT cb.*, b.code, b.base_production_json, b.input_resources_json, 
              b.output_resources_json, b.category
       FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND cb.building_id = ? AND cb.is_active = 1`
    )
      .bind(cityId, buildingId)
      .first<{
        level: number;
        last_production: number;
        storage_capacity: number;
        storage_json: string;
        code: string;
        base_production_json: string;
        input_resources_json: string;
        output_resources_json: string;
        category: string;
      }>();

    if (!building) {
      return;
    }

    const lastProduction = building.last_production || currentTime;
    const minutesElapsed = Math.max(0, (currentTime - lastProduction) / 60000);
    
    if (minutesElapsed < 0.1) {
      return; // Less than 6 seconds, skip
    }

    const storage: BuildingStorage = JSON.parse(building.storage_json || '{}');
    const currentStorage = Object.values(storage).reduce((sum, val) => sum + val, 0);
    const storageCapacity = building.storage_capacity || this.calculateBuildingStorageCapacity(building.level);
    const availableSpace = Math.max(0, storageCapacity - currentStorage);

    if (availableSpace <= 0) {
      // Building is full, update last_production to current time to prevent overflow
      await db.prepare(
        'UPDATE city_buildings SET last_production = ? WHERE city_id = ? AND building_id = ?'
      )
        .bind(currentTime, cityId, buildingId)
        .run();
      return;
    }

    const city = await db.prepare(
      'SELECT * FROM cities WHERE id = ?'
    )
      .bind(cityId)
      .first<{ region_id: string; happiness: number; user_id: string }>();

    if (!city) {
      return;
    }

    const region = await db.prepare(
      'SELECT * FROM regions WHERE id = ?'
    )
      .bind(city.region_id)
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

    const governor = await db.prepare(
      `SELECT g.bonus_json FROM city_governors cg
       JOIN governors g ON cg.governor_id = g.id
       WHERE cg.city_id = ? AND (cg.slot = 'city' OR cg.assigned_building_id = ?)`
    )
      .bind(cityId, `${cityId}:${buildingId}`)
      .first<{ bonus_json: string }>();

    let governorBonus = 0;
    if (governor) {
      const bonuses = JSON.parse(governor.bonus_json);
      for (const bonus of bonuses) {
        if (bonus.stat.startsWith('production:')) {
          governorBonus += bonus.value;
        }
      }
    }

    const baseProduction = JSON.parse(building.base_production_json || '{}');
    const inputResources = JSON.parse(building.input_resources_json || '{}');
    const outputResources = JSON.parse(building.output_resources_json || '{}');

    // Calculate production per minute, then multiply by minutes elapsed
    if (Object.keys(baseProduction).length > 0) {
      const productionPerMinute = CityManager.calculateProduction(
        baseProduction,
        building.level,
        {
          regionBias,
          governorBonus,
          happiness: city.happiness,
        }
      );

      // Calculate total production for elapsed time
      for (const [resource, perMinute] of Object.entries(productionPerMinute)) {
        const totalProduced = Math.floor(perMinute * minutesElapsed);
        const currentAmount = storage[resource] || 0;
        const newAmount = Math.min(
          currentAmount + totalProduced,
          storageCapacity // Cap at building capacity
        );
        storage[resource] = newAmount;
      }
    } else if (Object.keys(inputResources).length > 0) {
      // Processing buildings need resources from warehouse
      // For now, skip - they'll need a different system
      // TODO: Implement processing building production
    }

    // Update building storage and last_production
    await db.prepare(
      'UPDATE city_buildings SET storage_json = ?, last_production = ? WHERE city_id = ? AND building_id = ?'
    )
      .bind(JSON.stringify(storage), currentTime, cityId, buildingId)
      .run();
  }

  static async collectFromBuilding(
    db: D1Database,
    cityId: string,
    buildingIdOrCode: string
  ): Promise<CollectResult> {
    // buildingIdOrCode can be either a building ID or a building code
    // First try to find by code, then by ID
    let buildingId: string;
    
    const buildingByCode = await db.prepare(
      `SELECT cb.building_id FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND b.code = ?`
    )
      .bind(cityId, buildingIdOrCode)
      .first<{ building_id: string }>();
    
    if (buildingByCode) {
      buildingId = buildingByCode.building_id;
    } else {
      // Assume it's already an ID
      buildingId = buildingIdOrCode;
    }
    // First, process any pending production
    await this.processBuildingProduction(db, cityId, buildingId, Date.now());

    const building = await db.prepare(
      `SELECT cb.*, b.code
       FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND cb.building_id = ?`
    )
      .bind(cityId, buildingId)
      .first<{
        storage_json: string;
        code: string;
      }>();

    if (!building) {
      return {
        success: false,
        collected: {},
        buildingStorage: {},
        warehouseFull: false,
        error: 'Building not found',
      };
    }

    const storage: BuildingStorage = JSON.parse(building.storage_json || '{}');
    
    if (Object.keys(storage).length === 0 || Object.values(storage).every(v => v <= 0)) {
      return {
        success: false,
        collected: {},
        buildingStorage: {},
        warehouseFull: false,
        error: 'No resources to collect',
      };
    }

    // Get warehouse capacity
    const warehouseBuilding = await db.prepare(
      `SELECT cb.level FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND b.code = 'WAREHOUSE' AND cb.is_active = 1`
    )
      .bind(cityId)
      .first<{ level: number }>();

    const warehouseLevel = warehouseBuilding?.level || 1;
    const warehouseCapacity = CityManager.calculateWarehouseCapacity(warehouseLevel);

    // Get current warehouse usage
    const cityResources = await db.prepare(
      'SELECT resource_id, amount FROM city_resources WHERE city_id = ?'
    )
      .bind(cityId)
      .all<{ resource_id: string; amount: number }>();

    let currentWarehouseUsage = 0;
    for (const res of cityResources.results) {
      currentWarehouseUsage += Math.max(0, res.amount);
    }

    const collected: Record<string, number> = {};
    const remainingStorage: BuildingStorage = { ...storage };
    let warehouseFull = false;

    // Try to collect each resource
    for (const [resourceCode, amount] of Object.entries(storage)) {
      if (amount <= 0) {
        continue;
      }

      const resource = await db.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind(resourceCode)
        .first<{ id: string }>();

      if (!resource) {
        continue;
      }

      const availableWarehouseSpace = warehouseCapacity - currentWarehouseUsage;
      
      if (availableWarehouseSpace <= 0) {
        warehouseFull = true;
        break;
      }

      const amountToCollect = Math.min(amount, availableWarehouseSpace);
      collected[resourceCode] = amountToCollect;
      remainingStorage[resourceCode] = amount - amountToCollect;
      currentWarehouseUsage += amountToCollect;

      // Update city resources
      const existing = await db.prepare(
        'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
      )
        .bind(cityId, resource.id)
        .first<{ amount: number }>();

      if (existing) {
        await db.prepare(
          'UPDATE city_resources SET amount = amount + ? WHERE city_id = ? AND resource_id = ?'
        )
          .bind(amountToCollect, cityId, resource.id)
          .run();
      } else {
        await db.prepare(
          'INSERT INTO city_resources (city_id, resource_id, amount) VALUES (?, ?, ?)'
        )
          .bind(cityId, resource.id, amountToCollect)
          .run();
      }
    }

    // Update building storage
    await db.prepare(
      'UPDATE city_buildings SET storage_json = ? WHERE city_id = ? AND building_id = ?'
    )
      .bind(JSON.stringify(remainingStorage), cityId, buildingId)
      .run();

    return {
      success: true,
      collected,
      buildingStorage: remainingStorage,
      warehouseFull,
    };
  }

  static async collectAllBuildings(
    db: D1Database,
    cityId: string
  ): Promise<{ collected: Record<string, number>; buildingsCollected: number; warehouseFull: boolean }> {
    const buildings = await db.prepare(
      `SELECT cb.building_id FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND cb.is_active = 1`
    )
      .bind(cityId)
      .all<{ building_id: string }>();

    const totalCollected: Record<string, number> = {};
    let buildingsCollected = 0;
    let warehouseFull = false;

    for (const building of buildings.results) {
      const result = await this.collectFromBuilding(db, cityId, building.building_id);
      
      if (result.success && !result.warehouseFull) {
        buildingsCollected++;
        for (const [resource, amount] of Object.entries(result.collected)) {
          totalCollected[resource] = (totalCollected[resource] || 0) + amount;
        }
      } else if (result.warehouseFull) {
        warehouseFull = true;
        break;
      }
    }

    return {
      collected: totalCollected,
      buildingsCollected,
      warehouseFull,
    };
  }
}

