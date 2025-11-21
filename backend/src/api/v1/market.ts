import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';
import { MarketEngine } from '../../game/market';
import { MilestoneSystem } from '../../game/milestones';
import { validatePriceBand } from '../../utils/price-validation';
const MARKET_CONFIG = {
  maxOpenOrdersPerCity: 50,
  orderCancelCooldownSeconds: 30,
};

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

export async function handleMarket(
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

  if (request.method === 'GET' && url.pathname === '/api/v1/market/book') {
    const resourceCode = url.searchParams.get('resource');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!resourceCode) {
      return jsonResponse({ error: 'Resource code required' }, 400, corsHeaders);
    }

    
    const resource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind(resourceCode)
      .first<{ id: string }>();

    if (!resource) {
      return jsonResponse({ error: 'Resource not found' }, 404, corsHeaders);
    }

    
    await env.DB.prepare(
      `UPDATE market_orders SET status = 'expired' 
       WHERE resource_id = ? AND status = 'open' AND expires_at IS NOT NULL AND expires_at < ?`
    )
      .bind(resource.id, Date.now())
      .run();

    
    const expiredOrders = await env.DB.prepare(
      `SELECT * FROM market_orders 
       WHERE resource_id = ? AND status = 'expired' AND expires_at < ?`
    )
      .bind(resource.id, Date.now())
      .all();

    for (const order of expiredOrders.results as any[]) {
      if (order.side === 'buy') {
        const coinsResource = await env.DB.prepare(
          'SELECT id FROM resources WHERE code = ?'
        )
          .bind('COINS')
          .first<{ id: string }>();
        if (coinsResource) {
          const refundAmount = order.price * (order.qty - order.qty_filled);
          const currentCoins = await env.DB.prepare(
            'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
          ).bind(order.city_id, coinsResource.id).first<{ amount: number }>();
          const currentAmount = Math.max(0, currentCoins?.amount || 0);
          const newAmount = Math.max(0, currentAmount + refundAmount);
          await env.DB.prepare(
            `UPDATE city_resources SET amount = ? 
             WHERE city_id = ? AND resource_id = ?`
          )
            .bind(newAmount, order.city_id, coinsResource.id)
            .run();
        }
      } else {
        const refundAmount = order.qty - order.qty_filled;
        const currentResource = await env.DB.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        ).bind(order.city_id, order.resource_id).first<{ amount: number }>();
        const currentAmount = Math.max(0, currentResource?.amount || 0);
        const newAmount = Math.max(0, currentAmount + refundAmount);
        await env.DB.prepare(
          `UPDATE city_resources SET amount = ? 
           WHERE city_id = ? AND resource_id = ?`
        )
          .bind(newAmount, order.city_id, order.resource_id)
          .run();
      }
    }

    
    const buyOrders = await env.DB.prepare(
      `SELECT mo.*, c.name as city_name 
       FROM market_orders mo
       JOIN cities c ON mo.city_id = c.id
       WHERE mo.resource_id = ? AND mo.side = 'buy' AND mo.status = 'open'
       ORDER BY mo.price DESC, mo.created_at ASC
       LIMIT ?`
    )
      .bind(resource.id, limit)
      .all();

    
    const sellOrders = await env.DB.prepare(
      `SELECT mo.*, c.name as city_name 
       FROM market_orders mo
       JOIN cities c ON mo.city_id = c.id
       WHERE mo.resource_id = ? AND mo.side = 'sell' AND mo.status = 'open'
       ORDER BY mo.price ASC, mo.created_at ASC
       LIMIT ?`
    )
      .bind(resource.id, limit)
      .all();

    return jsonResponse({
      resource: resourceCode,
      bids: buyOrders.results,
      asks: sellOrders.results,
    }, 200, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/market/history') {
    const resourceCode = url.searchParams.get('resource');
    const bucket = url.searchParams.get('bucket') || '1h';
    const limit = parseInt(url.searchParams.get('limit') || '48');

    if (!resourceCode) {
      return jsonResponse({ error: 'Resource code required' }, 400, corsHeaders);
    }

    const resource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind(resourceCode)
      .first<{ id: string }>();

    if (!resource) {
      return jsonResponse({ error: 'Resource not found' }, 404, corsHeaders);
    }

    const history = await env.DB.prepare(
      `SELECT * FROM price_ohlcv 
       WHERE resource_id = ? AND bucket = ?
       ORDER BY bucket_start DESC
       LIMIT ?`
    )
      .bind(resource.id, bucket, limit)
      .all();

    return jsonResponse({
      resource: resourceCode,
      bucket,
      history: history.results,
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/market/order') {
    let userId: string;
    try {
      userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400, corsHeaders);
    }

    const body = await request.json() as {
      side: 'buy' | 'sell';
      resource: string;
      price: number;
      qty: number;
      tif?: number; 
    };

    
    if (!body.side || !['buy', 'sell'].includes(body.side)) {
      return jsonResponse({ error: 'Invalid side' }, 400, corsHeaders);
    }
    if (!body.resource || body.price <= 0 || body.qty <= 0) {
      return jsonResponse({ error: 'Invalid order parameters' }, 400, corsHeaders);
    }

    
    const city = await env.DB.prepare(
      'SELECT id, level FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; level: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 3) {
      return jsonResponse({ error: 'Market unlocks at city level 3' }, 403, corsHeaders);
    }

    
    const resource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind(body.resource)
      .first<{ id: string }>();

    if (!resource) {
      return jsonResponse({ error: 'Resource not found' }, 404, corsHeaders);
    }

    
    const openOrders = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM market_orders WHERE city_id = ? AND status = ?'
    )
      .bind(city.id, 'open')
      .first<{ count: number }>();

    if (openOrders && openOrders.count >= MARKET_CONFIG.maxOpenOrdersPerCity) {
      return jsonResponse({ error: 'Maximum open orders reached' }, 400, corsHeaders);
    }

    
    // Get resource base value for fallback
    const resourceData = await env.DB.prepare(
      'SELECT base_value FROM resources WHERE id = ?'
    )
      .bind(resource.id)
      .first<{ base_value: number }>();
    
    const baseValue = resourceData?.base_value || 1.0;
    
    // Get recent trades for VWAP calculation
    const recentTrades = await env.DB.prepare(
      `SELECT price, qty, traded_at FROM trades 
       WHERE resource_id = ? AND traded_at > ?
       ORDER BY traded_at DESC`
    )
      .bind(resource.id, Date.now() - (24 * 60 * 60 * 1000)) 
      .all<{ price: number; qty: number; traded_at: number }>();

    // Validate price band using VWAP or base value
    const priceValidation = validatePriceBand(
      body.price,
      recentTrades.results,
      baseValue,
      24 // 24 hour window
    );
    
    if (!priceValidation.valid) {
      return jsonResponse({ 
        error: priceValidation.error || 'Price validation failed',
        minPrice: priceValidation.minPrice,
        maxPrice: priceValidation.maxPrice,
        referencePrice: priceValidation.referencePrice
      }, 400, corsHeaders);
    }

    
    if (body.side === 'buy') {
      
      const coins = await env.DB.prepare(
        `SELECT cr.amount FROM city_resources cr
         JOIN resources r ON cr.resource_id = r.id
         WHERE cr.city_id = ? AND r.code = 'COINS'`
      )
        .bind(city.id)
        .first<{ amount: number }>();

      const totalCost = body.price * body.qty;
      if (!coins || coins.amount < totalCost) {
        return jsonResponse({ error: 'Insufficient coins' }, 400, corsHeaders);
      }

      
      const coinsResource = await env.DB.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind('COINS')
        .first<{ id: string }>();

      if (coinsResource) {
        await env.DB.prepare(
          `UPDATE city_resources SET amount = amount - ? 
           WHERE city_id = ? AND resource_id = ? AND amount >= ?`
        )
          .bind(totalCost, city.id, coinsResource.id, totalCost)
          .run();
      }
    } else {
      
      const stock = await env.DB.prepare(
        'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
      )
        .bind(city.id, resource.id)
        .first<{ amount: number }>();

      if (!stock || stock.amount < body.qty) {
        return jsonResponse({ error: 'Insufficient resources' }, 400, corsHeaders);
      }

      
      await env.DB.prepare(
        `UPDATE city_resources SET amount = amount - ? 
         WHERE city_id = ? AND resource_id = ? AND amount >= ?`
      )
        .bind(body.qty, city.id, resource.id, body.qty)
        .run();
    }

    
    const orderId = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = body.tif ? now + (body.tif * 1000) : null;

    await env.DB.prepare(
      'INSERT INTO market_orders (id, city_id, resource_id, side, price, qty, qty_filled, status, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(orderId, city.id, resource.id, body.side, body.price, body.qty, 0, 'open', now, expiresAt)
      .run();

    
    let executedMatches = 0;
    try {
      const marketDO = MarketEngine.getMarketDO(env, body.resource);
      
      const addOrderResponse = await marketDO.fetch(new Request('https://market/add-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          cityId: city.id,
          side: body.side,
          price: body.price,
          qty: body.qty,
          createdAt: now,
        }),
      }));

      const addOrderData = await addOrderResponse.json() as { matches?: any[] };
      const matches = addOrderData.matches || [];

      
      for (const match of matches) {
        try {
          
          // Get council tax rate from seller's region (tax is collected from seller)
          const sellerCityData = await env.DB.prepare(
            'SELECT region_id FROM cities WHERE id = ?'
          )
            .bind(match.cityIdSeller)
            .first<{ region_id: string }>();

          let taxRate = 0;
          if (sellerCityData) {
            const council = await env.DB.prepare(
              'SELECT tax_rate FROM councils WHERE region_id = ? LIMIT 1'
            )
              .bind(sellerCityData.region_id)
              .first<{ tax_rate: number }>();
            taxRate = council?.tax_rate || 0;
          }

          await MarketEngine.executeTrade(env.DB, match, resource.id, taxRate);
          executedMatches++;
        } catch (tradeError) {
          console.error('Trade execution error:', tradeError);
          
          if (body.side === 'buy') {
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
              const newAmount = Math.max(0, currentAmount + (body.price * body.qty));
              await env.DB.prepare(
                `UPDATE city_resources SET amount = ? 
                 WHERE city_id = ? AND resource_id = ?`
              )
                .bind(newAmount, city.id, coinsResource.id)
                .run();
            }
          } else {
            const currentResource = await env.DB.prepare(
              'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
            ).bind(city.id, resource.id).first<{ amount: number }>();
            const currentAmount = Math.max(0, currentResource?.amount || 0);
            const newAmount = Math.max(0, currentAmount + body.qty);
            await env.DB.prepare(
              `UPDATE city_resources SET amount = ? 
               WHERE city_id = ? AND resource_id = ?`
            )
              .bind(newAmount, city.id, resource.id)
              .run();
          }
        }
      }
    } catch (error) {
      console.error('Market matching error:', error);
      
      if (body.side === 'buy') {
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
          const newAmount = Math.max(0, currentAmount + (body.price * body.qty));
          await env.DB.prepare(
            `UPDATE city_resources SET amount = ? 
             WHERE city_id = ? AND resource_id = ?`
          )
            .bind(newAmount, city.id, coinsResource.id)
            .run();
        }
      } else {
        const currentResource = await env.DB.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        ).bind(city.id, resource.id).first<{ amount: number }>();
        const currentAmount = Math.max(0, currentResource?.amount || 0);
        const newAmount = Math.max(0, currentAmount + body.qty);
        await env.DB.prepare(
          `UPDATE city_resources SET amount = ? 
           WHERE city_id = ? AND resource_id = ?`
        )
          .bind(newAmount, city.id, resource.id)
          .run();
      }
      
      await env.DB.prepare(
        'UPDATE market_orders SET status = ? WHERE id = ?'
      )
        .bind('cancelled', orderId)
        .run();
      return jsonResponse({ error: 'Failed to place order' }, 500, corsHeaders);
    }

    
    const finalOrder = await env.DB.prepare(
      'SELECT qty, qty_filled, status FROM market_orders WHERE id = ?'
    )
      .bind(orderId)
      .first<{ qty: number; qty_filled: number; status: string }>();

    if (executedMatches > 0 || finalOrder?.status === 'open') {
      await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'first_market_trade', 1);
    }

    return jsonResponse({
      orderId,
      status: finalOrder?.status || 'open',
      filled: finalOrder?.qty_filled || executedMatches > 0 ? body.qty : 0,
      matchesExecuted: executedMatches,
    }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/market/quick-buy') {
    let userId: string;
    try {
      userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400, corsHeaders);
    }

    const body = await request.json() as {
      resource: string;
      qty: number;
    };

    const city = await env.DB.prepare(
      'SELECT id, level FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; level: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 3) {
      return jsonResponse({ error: 'Market unlocks at city level 3' }, 403, corsHeaders);
    }

    const resource = await env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind(body.resource)
      .first<{ id: string }>();

    if (!resource) {
      return jsonResponse({ error: 'Resource not found' }, 404, corsHeaders);
    }

    const sellOrders = await env.DB.prepare(
      `SELECT id, price, qty, qty_filled, city_id FROM market_orders 
       WHERE resource_id = ? AND side = 'sell' AND status = 'open'
       ORDER BY price ASC, created_at ASC
       LIMIT 1`
    )
      .bind(resource.id)
      .first<{ id: string; price: number; qty: number; qty_filled: number; city_id: string }>();

    if (!sellOrders) {
      return jsonResponse({ error: 'No sell orders available' }, 404, corsHeaders);
    }

    const marketPrice = sellOrders.price;
    const availableQty = sellOrders.qty - sellOrders.qty_filled;
    const qtyToBuy = Math.min(body.qty, availableQty);
    
    const transactionFee = marketPrice * qtyToBuy * 0.01;
    const totalCost = marketPrice * qtyToBuy + transactionFee;

    const coins = await env.DB.prepare(
      `SELECT cr.amount FROM city_resources cr
       JOIN resources r ON cr.resource_id = r.id
       WHERE cr.city_id = ? AND r.code = 'COINS'`
    )
      .bind(city.id)
      .first<{ amount: number }>();

    if (!coins || coins.amount < totalCost) {
      return jsonResponse({ error: 'Insufficient coins' }, 400, corsHeaders);
    }

    const buyOrderId = crypto.randomUUID();
    const now = Date.now();
    
    await env.DB.prepare(
      'INSERT INTO market_orders (id, city_id, resource_id, side, price, qty, qty_filled, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(buyOrderId, city.id, resource.id, 'buy', marketPrice, qtyToBuy, 0, 'open', now)
      .run();

    const match = {
      buyOrderId,
      sellOrderId: sellOrders.id,
      cityIdBuyer: city.id,
      cityIdSeller: sellOrders.city_id,
      price: marketPrice,
      qty: qtyToBuy,
    };

    try {
      // Get council tax rate from seller's region
      const sellerCityData = await env.DB.prepare(
        'SELECT region_id FROM cities WHERE id = ?'
      )
        .bind(sellOrders.city_id)
        .first<{ region_id: string }>();
      
      let taxRate = 0;
      if (sellerCityData) {
        const council = await env.DB.prepare(
          'SELECT tax_rate FROM councils WHERE region_id = ? LIMIT 1'
        )
          .bind(sellerCityData.region_id)
          .first<{ tax_rate: number }>();
        taxRate = council?.tax_rate || 0;
      }
      
      await MarketEngine.executeTrade(env.DB, match, resource.id, taxRate);
      await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'first_market_trade', 1);
      return jsonResponse({ success: true, qty: qtyToBuy, price: marketPrice }, 200, corsHeaders);
    } catch (error: any) {
      await env.DB.prepare('UPDATE market_orders SET status = ? WHERE id = ?')
        .bind('cancelled', buyOrderId).run();
      return jsonResponse({ error: error.message || 'Trade failed' }, 400, corsHeaders);
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/market/quick-sell') {
    let userId: string;
    try {
      userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400, corsHeaders);
    }

    const body = await request.json() as {
      resource: string;
      qty: number;
    };

    const city = await env.DB.prepare(
      'SELECT id, level FROM cities WHERE user_id = ?'
    )
      .bind(userId)
      .first<{ id: string; level: number }>();

    if (!city) {
      return jsonResponse({ error: 'City not found' }, 404, corsHeaders);
    }

    if (city.level < 3) {
      return jsonResponse({ error: 'Market unlocks at city level 3' }, 403, corsHeaders);
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

    if (!stock || stock.amount < body.qty) {
      return jsonResponse({ error: 'Insufficient resources' }, 400, corsHeaders);
    }

    const buyOrders = await env.DB.prepare(
      `SELECT * FROM market_orders 
       WHERE resource_id = ? AND side = 'buy' AND status = 'open'
       ORDER BY price DESC, created_at ASC
       LIMIT 1`
    )
      .bind(resource.id)
      .first<{ price: number; qty: number; qty_filled: number; city_id: string; id: string }>();

    if (!buyOrders) {
      return jsonResponse({ error: 'No buy orders available' }, 404, corsHeaders);
    }

    const marketPrice = buyOrders.price;
    const availableQty = buyOrders.qty - buyOrders.qty_filled;
    const qtyToSell = Math.min(body.qty, availableQty);

    const sellOrderId = crypto.randomUUID();
    const now = Date.now();
    
    await env.DB.prepare(
      'INSERT INTO market_orders (id, city_id, resource_id, side, price, qty, qty_filled, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(sellOrderId, city.id, resource.id, 'sell', marketPrice, qtyToSell, 0, 'open', now)
      .run();

    const match = {
      buyOrderId: buyOrders.id,
      sellOrderId,
      cityIdBuyer: buyOrders.city_id,
      cityIdSeller: city.id,
      price: marketPrice,
      qty: qtyToSell,
    };

    try {
      // Get council tax rate from seller's region (this city)
      const sellerCityData = await env.DB.prepare(
        'SELECT region_id FROM cities WHERE id = ?'
      )
        .bind(city.id)
        .first<{ region_id: string }>();
      
      let taxRate = 0;
      if (sellerCityData) {
        const council = await env.DB.prepare(
          'SELECT tax_rate FROM councils WHERE region_id = ? LIMIT 1'
        )
          .bind(sellerCityData.region_id)
          .first<{ tax_rate: number }>();
        taxRate = council?.tax_rate || 0;
      }
      
      await MarketEngine.executeTrade(env.DB, match, resource.id, taxRate);
      await MilestoneSystem.checkAndGrantMilestone(env.DB, userId, 'first_market_trade', 1);
      return jsonResponse({ success: true, qty: qtyToSell, price: marketPrice }, 200, corsHeaders);
    } catch (error: any) {
      await env.DB.prepare('UPDATE market_orders SET status = ? WHERE id = ?')
        .bind('cancelled', sellOrderId).run();
      return jsonResponse({ error: error.message || 'Trade failed' }, 400, corsHeaders);
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/market/cancel') {
    let userId: string;
    try {
      userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
    } catch (error: any) {
      return jsonResponse({ error: error.message }, 400, corsHeaders);
    }

    const body = await request.json() as { orderId: string };

    
    const order = await env.DB.prepare(
      `SELECT mo.* FROM market_orders mo
       JOIN cities c ON mo.city_id = c.id
       WHERE mo.id = ? AND c.user_id = ?`
    )
      .bind(body.orderId, userId)
      .first();

    if (!order) {
      return jsonResponse({ error: 'Order not found' }, 404, corsHeaders);
    }

    if ((order as any).status !== 'open') {
      return jsonResponse({ error: 'Order cannot be cancelled' }, 400, corsHeaders);
    }

    
    if ((order as any).side === 'buy') {
      const coinsResource = await env.DB.prepare(
        'SELECT id FROM resources WHERE code = ?'
      )
        .bind('COINS')
        .first<{ id: string }>();

      if (coinsResource) {
        const refundAmount = ((order as any).price * ((order as any).qty - (order as any).qty_filled));
        const currentCoins = await env.DB.prepare(
          'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
        ).bind((order as any).city_id, coinsResource.id).first<{ amount: number }>();
        const currentAmount = Math.max(0, currentCoins?.amount || 0);
        const newAmount = Math.max(0, currentAmount + refundAmount);
        await env.DB.prepare(
          `UPDATE city_resources SET amount = ? 
           WHERE city_id = ? AND resource_id = ?`
        )
          .bind(newAmount, (order as any).city_id, coinsResource.id)
          .run();
      }
    } else {
      const refundAmount = (order as any).qty - (order as any).qty_filled;
      const currentResource = await env.DB.prepare(
        'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
      ).bind((order as any).city_id, (order as any).resource_id).first<{ amount: number }>();
      const currentAmount = Math.max(0, currentResource?.amount || 0);
      const newAmount = Math.max(0, currentAmount + refundAmount);
      await env.DB.prepare(
        `UPDATE city_resources SET amount = ? 
         WHERE city_id = ? AND resource_id = ?`
      )
        .bind(newAmount, (order as any).city_id, (order as any).resource_id)
        .run();
    }

    
    await env.DB.prepare(
      'UPDATE market_orders SET status = ? WHERE id = ?'
    )
      .bind('cancelled', body.orderId)
      .run();

    
    try {
      const resource = await env.DB.prepare(
        `SELECT r.code FROM resources r
         JOIN market_orders mo ON r.id = mo.resource_id
         WHERE mo.id = ?`
      )
        .bind(body.orderId)
        .first<{ code: string }>();

      if (resource) {
        const marketDO = MarketEngine.getMarketDO(env, resource.code);
        await marketDO.fetch(new Request('https://market/cancel-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: body.orderId }),
        }));
      }
    } catch (error) {
      console.error('Error removing order from DO:', error);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

