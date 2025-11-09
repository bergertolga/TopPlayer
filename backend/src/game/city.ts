const BALANCE_CONFIG = {
  production: { baseMultiplierPerLevel: 0.15 },
  refining: { baseEfficiency: 0.9, efficiencyPerLevel: 0.02 },
  happiness: { base: 0.9, foodDeficitPenalty: -0.1, fabricDeficitPenalty: -0.05, festivalBonus: 0.02, min: 0.0, max: 1.0 },
  warehouse: { baseCapacity: 5000, capacityMultiplier: 1.5 },
};

export interface CityState {
  id: string;
  userId: string;
  regionId: string;
  level: number;
  population: number;
  happiness: number;
  lastTick: number;
}

export interface BuildingProduction {
  buildingCode: string;
  level: number;
  production: Record<string, number>;
}

export interface CityTickResult {
  cityId: string;
  delta: Record<string, number>;
  happiness: number;
  notes: string[];
}

export class CityManager {
  static calculateProduction(
    baseProduction: Record<string, number>,
    level: number,
    modifiers: {
      regionBias?: Record<string, number>;
      governorBonus?: number;
      happiness?: number;
      fuelBonus?: number;
      heroBonus?: number;
    } = {}
  ): Record<string, number> {
    const levelMultiplier = 1 + (BALANCE_CONFIG.production.baseMultiplierPerLevel * (level - 1));
    const production: Record<string, number> = {};

    for (const [resource, baseAmount] of Object.entries(baseProduction)) {
      let amount = baseAmount * levelMultiplier;

      if (modifiers.regionBias?.[resource]) {
        amount *= modifiers.regionBias[resource];
      }

      if (modifiers.governorBonus) {
        amount *= (1 + modifiers.governorBonus);
      }

      if (modifiers.happiness !== undefined) {
        const happinessMultiplier = 0.8 + (modifiers.happiness * 0.4);
        amount *= happinessMultiplier;
      }

      if (modifiers.fuelBonus) {
        amount *= (1 + modifiers.fuelBonus);
      }

      if (modifiers.heroBonus) {
        amount *= (1 + modifiers.heroBonus);
      }

      production[resource] = Math.floor(amount);
    }

    return production;
  }

  static calculateConsumption(population: number): Record<string, number> {
    return {
      FOOD: Math.floor(population * 0.1),
      FABRIC: Math.floor(population * 0.05),
    };
  }

  static calculateHappiness(
    currentHappiness: number,
    foodDeficit: boolean,
    fabricDeficit: boolean,
    festivalActive: boolean = false
  ): number {
    let happiness = currentHappiness;

    if (foodDeficit) {
      happiness += BALANCE_CONFIG.happiness.foodDeficitPenalty;
    }
    if (fabricDeficit) {
      happiness += BALANCE_CONFIG.happiness.fabricDeficitPenalty;
    }
    if (festivalActive) {
      happiness += BALANCE_CONFIG.happiness.festivalBonus;
    }

    happiness = Math.max(BALANCE_CONFIG.happiness.min, Math.min(BALANCE_CONFIG.happiness.max, happiness));

    return Math.round(happiness * 100) / 100;
  }

  static calculateWarehouseCapacity(warehouseLevel: number): number {
    return Math.floor(
      BALANCE_CONFIG.warehouse.baseCapacity * Math.pow(BALANCE_CONFIG.warehouse.capacityMultiplier, warehouseLevel - 1)
    );
  }

  static async processCityTick(
    db: D1Database,
    cityId: string,
    currentTime: number
  ): Promise<CityTickResult> {
    const city = await db.prepare(
      'SELECT * FROM cities WHERE id = ?'
    )
      .bind(cityId)
      .first<CityState & { region_id: string; shield_until: number; user_id: string }>();

    if (!city) {
      throw new Error('City not found');
    }

    const notes: string[] = [];
    const delta: Record<string, number> = {};
    let newHappiness = city.happiness;

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

    const buildings = await db.prepare(
      `SELECT cb.*, b.code, b.category, b.base_production_json, b.input_resources_json, 
              b.output_resources_json, b.upkeep_coins, b.upkeep_resources_json
       FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND cb.is_active = 1`
    )
      .bind(cityId)
      .all();

    const resources = await db.prepare(
      'SELECT resource_id, amount FROM city_resources WHERE city_id = ?'
    )
      .bind(cityId)
      .all<{ resource_id: string; amount: number }>();

    const resourceMap: Record<string, number> = {};
    for (const res of resources.results as any[]) {
      const resource = await db.prepare(
        'SELECT code FROM resources WHERE id = ?'
      )
        .bind(res.resource_id)
        .first<{ code: string }>();
      
      if (resource) {
        resourceMap[resource.code] = Math.max(0, res.amount);
      }
    }

    const warehouseBuilding = buildings.results.find((b: any) => b.code === 'WAREHOUSE') as any;
    const warehouseLevel: number = warehouseBuilding?.level || 1;
    const warehouseCapacity = this.calculateWarehouseCapacity(warehouseLevel);

    let currentTotalResources = 0;
    for (const amount of Object.values(resourceMap)) {
      currentTotalResources += Math.max(0, amount);
    }

    const userHeroes = await db.prepare(
      `SELECT uh.level, uh.stars, h.base_power 
       FROM user_heroes uh 
       JOIN heroes h ON uh.hero_id = h.id 
       WHERE uh.user_id = ?`
    )
      .bind(city.user_id)
      .all();

    let totalHeroPower = 0;
    if (userHeroes.results.length > 0) {
      const { HeroManager } = await import('./heroes');
      const heroManager = new HeroManager();
      for (const hero of userHeroes.results as any[]) {
        const power = heroManager.calculateHeroPower(hero.base_power, hero.level, hero.stars);
        totalHeroPower += power;
      }
    }

    const heroBonus = Math.min(0.5, (totalHeroPower / 1000) * 0.1);

    for (const code of Object.keys(resourceMap)) {
      delta[code] = 0;
    }

    for (const building of buildings.results as any[]) {
      const baseProduction = JSON.parse(building.base_production_json || '{}');
      const inputResources = JSON.parse(building.input_resources_json || '{}');
      const outputResources = JSON.parse(building.output_resources_json || '{}');
      const upkeepResources = JSON.parse(building.upkeep_resources_json || '{}');

      const governor = await db.prepare(
        `SELECT g.bonus_json FROM city_governors cg
         JOIN governors g ON cg.governor_id = g.id
         WHERE cg.city_id = ? AND (cg.slot = 'city' OR cg.assigned_building_id = ?)`
      )
        .bind(cityId, `${cityId}:${building.building_id}`)
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

      if (Object.keys(baseProduction).length > 0) {
        const production = this.calculateProduction(
          baseProduction,
          building.level,
          {
            regionBias,
            governorBonus,
            happiness: city.happiness,
            heroBonus,
          }
        );

        for (const [resource, amount] of Object.entries(production)) {
          delta[resource] = (delta[resource] || 0) + amount;
        }
      } else if (Object.keys(inputResources).length > 0) {
        let canProcess = true;
        for (const [resource, required] of Object.entries(inputResources)) {
          const requiredAmount = required as number;
          const available = resourceMap[resource] || 0;
          if (available < requiredAmount) {
            canProcess = false;
            break;
          }
        }

        if (canProcess) {
          const efficiency = BALANCE_CONFIG.refining.baseEfficiency + 
                            (BALANCE_CONFIG.refining.efficiencyPerLevel * (building.level - 1));
          
          for (const [resource, required] of Object.entries(inputResources)) {
            const consumed = required as number;
            delta[resource] = (delta[resource] || 0) - consumed;
            resourceMap[resource] = (resourceMap[resource] || 0) - consumed;
          }

          for (const [resource, baseOutput] of Object.entries(outputResources)) {
            const output = Math.floor((baseOutput as number) * efficiency);
            delta[resource] = (delta[resource] || 0) + output;
          }
        }
      }

      if (building.upkeep_coins > 0) {
        const coinsAvailable = resourceMap['COINS'] || 0;
        if (coinsAvailable >= building.upkeep_coins) {
          delta['COINS'] = (delta['COINS'] || 0) - building.upkeep_coins;
        } else {
          await db.prepare(
            'UPDATE city_buildings SET is_active = 0 WHERE city_id = ? AND building_id = ?'
          )
            .bind(cityId, building.building_id)
            .run();
          notes.push(`${building.code} paused due to insufficient upkeep`);
        }
      }

      for (const [resource, required] of Object.entries(upkeepResources)) {
        const requiredAmount = required as number;
        const available = resourceMap[resource] || 0;
        if (available >= requiredAmount) {
          delta[resource] = (delta[resource] || 0) - requiredAmount;
        } else {
          await db.prepare(
            'UPDATE city_buildings SET is_active = 0 WHERE city_id = ? AND building_id = ?'
          )
            .bind(cityId, building.building_id)
            .run();
          notes.push(`${building.code} paused due to insufficient ${resource}`);
          break;
        }
      }
    }

    const consumption = this.calculateConsumption(city.population);
    let foodDeficit = false;
    let fabricDeficit = false;

    for (const [resource, required] of Object.entries(consumption)) {
      const available = resourceMap[resource] || 0;
      if (available >= required) {
        delta[resource] = (delta[resource] || 0) - required;
      } else {
        delta[resource] = (delta[resource] || 0) - available;
        if (resource === 'FOOD') foodDeficit = true;
        if (resource === 'FABRIC') fabricDeficit = true;
        notes.push(`Population ${resource} deficit`);
      }
    }

    newHappiness = this.calculateHappiness(city.happiness, foodDeficit, fabricDeficit, false);

    let totalResourceChange = 0;
    for (const change of Object.values(delta)) {
      if (change > 0) {
        totalResourceChange += change;
      }
    }

    const availableCapacity = Math.max(0, warehouseCapacity - currentTotalResources);
    const capacityExceeded = totalResourceChange > availableCapacity;
    
    if (capacityExceeded && totalResourceChange > 0) {
      const scaleFactor = availableCapacity / totalResourceChange;
      for (const [resourceCode, change] of Object.entries(delta)) {
        if (change > 0) {
          delta[resourceCode] = Math.floor(change * scaleFactor);
        }
      }
      notes.push(`Warehouse capacity exceeded. Production capped at ${Math.floor(availableCapacity)} units.`);
    }

    for (const [resourceCode, change] of Object.entries(delta)) {
      if (change !== 0) {
        const resource = await db.prepare(
          'SELECT id FROM resources WHERE code = ?'
        )
          .bind(resourceCode)
          .first<{ id: string }>();

        if (resource) {
          const finalChange = Math.max(0, change);
          const currentAmount = Math.max(0, resourceMap[resourceCode] || 0);
          const newAmount = Math.max(0, currentAmount + finalChange);
          
          await db.prepare(
            `INSERT INTO city_resources (city_id, resource_id, amount)
             VALUES (?, ?, ?)
             ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
          )
            .bind(cityId, resource.id, newAmount, newAmount)
            .run();
        }
      }
    }

    await db.prepare(
      'UPDATE cities SET happiness = ?, last_tick = ? WHERE id = ?'
    )
      .bind(newHappiness, currentTime, cityId)
      .run();

    return {
      cityId,
      delta,
      happiness: newHappiness,
      notes,
    };
  }
}

