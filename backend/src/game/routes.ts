const ROUTE_CONFIG = {
  baseRiskChance: 0.1,
  escortReduction: 0.5,
  maxRiskReduction: 0.95,
  baseTravelTime: 30,
};

export class RouteProcessor {
  static async processRoutes(db: D1Database, currentTime: number): Promise<void> {
    const arrivingRoutes = await db.prepare(
      `SELECT r.*, origin_city.user_id, origin_city.region_id as origin_region_id
       FROM routes r
       JOIN cities origin_city ON r.city_id = origin_city.id
       WHERE r.status = 'active' AND r.next_departure <= ?
       ORDER BY r.next_departure ASC
       LIMIT 100`
    )
      .bind(currentTime)
      .all();

    for (const route of arrivingRoutes.results as any[]) {
      try {
        // Check origin city has resources
        const originResourceCheck = await db.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        ).bind(route.city_id, route.resource_id).first<{ amount: number }>();
        
        const availableResource = Math.max(0, originResourceCheck?.amount || 0);
        if (availableResource < route.qty_per_trip) {
          await db.prepare('UPDATE routes SET status = ? WHERE id = ?')
            .bind('paused', route.id).run();
          continue;
        }

        // Find destination city in the destination region
        // For now, routes deliver to any city in the destination region
        // In a full implementation, you might want destination_city_id in routes table
        const destinationCity = await db.prepare(
          'SELECT id FROM cities WHERE region_id = ? AND id != ? LIMIT 1'
        )
          .bind(route.to_region_id, route.city_id)
          .first<{ id: string }>();

        if (!destinationCity) {
          // No destination city found - pause route
          await db.prepare('UPDATE routes SET status = ? WHERE id = ?')
            .bind('paused', route.id).run();
          continue;
        }

        const destinationCityId = destinationCity.id;

        const riskChance = Math.max(
          0.01,
          ROUTE_CONFIG.baseRiskChance * Math.pow(1 - ROUTE_CONFIG.escortReduction, route.escort_level || 0)
        );

        const riskRoll = Math.random();
        let resourcesDelivered = route.qty_per_trip;
        let eventType: string | null = null;
        let eventMessage: string | null = null;

        if (riskRoll < riskChance) {
          const eventRoll = Math.random();
          if (eventRoll < 0.3) {
            const lossPercent = 0.3 + (Math.random() * 0.2);
            resourcesDelivered = Math.floor(route.qty_per_trip * (1 - lossPercent));
            eventType = 'bandit_attack';
            eventMessage = `Bandits attacked! Lost ${Math.round(lossPercent * 100)}% of cargo.`;
          } else if (eventRoll < 0.6) {
            const delayMinutes = Math.floor(route.cycle_minutes * 0.5);
            const nextDeparture = currentTime + ((route.cycle_minutes + delayMinutes) * 60 * 1000);
            await db.prepare(
              'UPDATE routes SET next_departure = ? WHERE id = ?'
            )
              .bind(nextDeparture, route.id)
              .run();
            eventType = 'weather_delay';
            eventMessage = `Severe weather delayed the route by ${delayMinutes} minutes.`;
            continue;
          } else {
            const lossPercent = 0.1 + (Math.random() * 0.1);
            resourcesDelivered = Math.floor(route.qty_per_trip * (1 - lossPercent));
            eventType = 'minor_damage';
            eventMessage = `Route encountered minor issues. Lost ${Math.round(lossPercent * 100)}% of cargo.`;
          }
        }
        if (resourcesDelivered > 0) {
          // Deduct resources from origin city
          const originResourceCurrent = await db.prepare(
            'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
          ).bind(route.city_id, route.resource_id).first<{ amount: number }>();
          
          const originResourceAmount = Math.max(0, originResourceCurrent?.amount || 0);
          const newOriginAmount = Math.max(0, originResourceAmount - route.qty_per_trip);
          
          await db.prepare(
            `UPDATE city_resources SET amount = ? 
             WHERE city_id = ? AND resource_id = ?`
          )
            .bind(newOriginAmount, route.city_id, route.resource_id)
            .run();

          // Check destination warehouse capacity
          const destinationWarehouse = await db.prepare(
            `SELECT cb.level FROM city_buildings cb
             JOIN buildings b ON cb.building_id = b.id
             WHERE cb.city_id = ? AND b.code = 'WAREHOUSE' AND cb.is_active = 1`
          ).bind(destinationCityId).first<{ level: number }>();
          
          const warehouseLevel = destinationWarehouse?.level || 1;
          const { CityManager } = await import('./city');
          const warehouseCapacity = CityManager.calculateWarehouseCapacity(warehouseLevel);

          const destinationResources = await db.prepare(
            'SELECT amount FROM city_resources WHERE city_id = ?'
          ).bind(destinationCityId).all<{ amount: number }>();
          
          let destinationTotalResources = 0;
          for (const res of destinationResources.results) {
            destinationTotalResources += Math.max(0, res.amount);
          }

          const destinationResourceCurrent = await db.prepare(
            'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
          ).bind(destinationCityId, route.resource_id).first<{ amount: number }>();
          
          const destinationResourceAmount = Math.max(0, destinationResourceCurrent?.amount || 0);
          const availableCapacity = Math.max(0, warehouseCapacity - destinationTotalResources);
          const actualDelivered = Math.min(resourcesDelivered, availableCapacity);

          if (actualDelivered < resourcesDelivered) {
            eventType = eventType || 'warehouse_full';
            eventMessage = eventMessage || `Warehouse full. Only ${actualDelivered} of ${resourcesDelivered} units delivered.`;
            resourcesDelivered = actualDelivered;
          }

          if (resourcesDelivered > 0) {
            const newAmount = Math.max(0, destinationResourceAmount + resourcesDelivered);
            await db.prepare(
              `INSERT INTO city_resources (city_id, resource_id, amount, protected)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
            )
              .bind(destinationCityId, route.resource_id, newAmount, 0, newAmount)
              .run();
          }
        }

        if (eventType) {
          await db.prepare(
            `INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at)
             VALUES (?, ?, ?, ?, ?)`
          )
            .bind(
              crypto.randomUUID(),
              route.user_id,
              'route_event',
              JSON.stringify({
                routeId: route.id,
                eventType,
                message: eventMessage,
                resourcesDelivered,
                resourcesLost: route.qty_per_trip - resourcesDelivered,
              }),
              currentTime
            )
            .run();
        }

        if (route.repeats === -1 || route.repeats > 0) {
          const nextDeparture = currentTime + (route.cycle_minutes * 60 * 1000);
          const newRepeats = route.repeats === -1 ? -1 : route.repeats - 1;

          await db.prepare(
            'UPDATE routes SET next_departure = ?, repeats = ? WHERE id = ?'
          )
            .bind(nextDeparture, newRepeats, route.id)
            .run();
        } else {
          await db.prepare(
            'UPDATE routes SET status = ? WHERE id = ?'
          )
            .bind('completed', route.id)
            .run();
        }
      } catch (error) {
        console.error(`Error processing route ${route.id}:`, error);
      }
    }
  }
}


