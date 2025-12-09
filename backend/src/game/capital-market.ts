import { Env } from '../types';
import { MarketEngine } from './market';

const CAPITAL_CONFIG = {
  resources: ['WOOD', 'FOOD'],
  targetDepth: 5000, // Ensure at least this much quantity is available
  price: 5.0, // High price ceiling
  batchSize: 1000, // Add in chunks
};

export class CapitalMarketManager {
  static async processCapitalInjection(env: Env): Promise<void> {
    // 1. Find Capital City
    const capitalCity = await env.DB.prepare(
      "SELECT id FROM cities WHERE name = 'The Capital' LIMIT 1"
    ).first<{ id: string }>();

    if (!capitalCity) {
      console.warn('Capital city not found for market injection.');
      return;
    }

    const now = Date.now();

    for (const resourceCode of CAPITAL_CONFIG.resources) {
      // 2. Check Market Depth
      const resource = await env.DB.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind(resourceCode)
        .first<{ id: string }>();

      if (!resource) continue;

      const depth = await env.DB.prepare(
        `SELECT SUM(qty - qty_filled) as total_qty 
         FROM market_orders 
         WHERE resource_id = ? AND side = 'sell' AND status = 'open'`
      )
        .bind(resource.id)
        .first<{ total_qty: number }>();

      const currentDepth = depth?.total_qty || 0;

      if (currentDepth < CAPITAL_CONFIG.targetDepth) {
        const shortfall = CAPITAL_CONFIG.targetDepth - currentDepth;
        const injectionQty = Math.min(shortfall, CAPITAL_CONFIG.batchSize);

        if (injectionQty > 0) {
          // 3. Inject Order
          await this.injectOrder(env, capitalCity.id, resource.id, resourceCode, injectionQty, CAPITAL_CONFIG.price, now);
        }
      }
    }
  }

  private static async injectOrder(
    env: Env,
    cityId: string,
    resourceId: string,
    resourceCode: string,
    qty: number,
    price: number,
    now: number
  ): Promise<void> {
    const orderId = crypto.randomUUID();
    const expiresAt = now + (1000 * 60 * 60 * 24); // 24 hours

    // Ensure Capital has resources (Infinite supply trick: just add them before selling)
    // Actually, we should probably just add them to the order directly without checking city_resources
    // BUT, MarketEngine.executeTrade checks seller resources. So we MUST give Capital resources.
    
    await env.DB.prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = amount + ?`
    )
      .bind(cityId, resourceId, qty, 0, qty)
      .run();

    await env.DB.prepare(
      'INSERT INTO market_orders (id, city_id, resource_id, side, price, qty, qty_filled, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(orderId, cityId, resourceId, 'sell', price, qty, 0, 'open', now, expiresAt)
      .run();

    try {
      const marketDO = MarketEngine.getMarketDO(env, resourceCode);
      await marketDO.fetch(new Request('https://market/add-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          cityId,
          side: 'sell',
          price,
          qty,
          createdAt: now,
        }),
      }));
      console.log(`Capital injected ${qty} ${resourceCode} at ${price}`);
    } catch (error) {
      console.error('Failed to notify MarketDO of capital injection:', error);
    }
  }
}





