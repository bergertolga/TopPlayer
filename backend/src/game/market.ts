import { Env } from '../types';

const MARKET_CONFIG = {
  transactionFee: 0.01,
  maxTaxRate: 0.05,
};

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface TradeMatch {
  buyOrderId: string;
  sellOrderId: string;
  cityIdBuyer: string;
  cityIdSeller: string;
  price: number;
  qty: number;
}

export class MarketEngine {
  static async executeTrade(
    db: D1Database,
    match: TradeMatch,
    resourceId: string,
    councilTaxRate: number = 0
  ): Promise<void> {
    const grossValue = match.price * match.qty;
    const transactionFee = roundCurrency(grossValue * MARKET_CONFIG.transactionFee);
    const normalizedTaxRate = Math.min(Math.max(councilTaxRate, 0), MARKET_CONFIG.maxTaxRate);

    /**
     * Tax rule:
     * - Tax is skimmed from the seller's proceeds at `normalizedTaxRate` of the gross value
     * - Buyer pays gross + fee + tax; seller receives gross - fee - tax; council treasury gets the tax
     * - All currency math is rounded to 2 decimals
     */
    const tax = roundCurrency(Math.min(grossValue, grossValue * normalizedTaxRate));
    const totalCost = roundCurrency(grossValue + transactionFee + tax);
    const sellerReceives = Math.max(0, roundCurrency(grossValue - transactionFee - tax));

    const resource = await db.prepare(
      'SELECT code FROM resources WHERE id = ?'
    )
      .bind(resourceId)
      .first<{ code: string }>();

    if (!resource) {
      throw new Error('Resource not found');
    }

    
    const coinsResource = await db.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind('COINS')
      .first<{ id: string }>();

    if (!coinsResource) {
      throw new Error('COINS resource not found');
    }

    const buyerCity = await db.prepare('SELECT id FROM cities WHERE id = ?').bind(match.cityIdBuyer).first<{ id: string }>();
    const sellerCity = await db.prepare('SELECT id FROM cities WHERE id = ?').bind(match.cityIdSeller).first<{ id: string }>();
    
    if (!buyerCity || !sellerCity) {
      throw new Error('City not found');
    }

    const buyerWarehouse = await db.prepare(
      `SELECT cb.level FROM city_buildings cb
       JOIN buildings b ON cb.building_id = b.id
       WHERE cb.city_id = ? AND b.code = 'WAREHOUSE' AND cb.is_active = 1`
    ).bind(match.cityIdBuyer).first<{ level: number }>();
    
    const warehouseLevel = buyerWarehouse?.level || 1;
    const { CityManager } = await import('./city');
    const warehouseCapacity = CityManager.calculateWarehouseCapacity(warehouseLevel);

    const buyerResources = await db.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ?'
    ).bind(match.cityIdBuyer).all<{ amount: number }>();
    
    let buyerTotalResources = 0;
    for (const res of buyerResources.results) {
      buyerTotalResources += Math.max(0, res.amount);
    }

    const buyerResourceCurrent = await db.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    ).bind(match.cityIdBuyer, resourceId).first<{ amount: number }>();
    
    const buyerResourceAmount = Math.max(0, buyerResourceCurrent?.amount || 0);
    const availableCapacity = Math.max(0, warehouseCapacity - buyerTotalResources);
    const resourceQtyToAdd = Math.min(match.qty, availableCapacity);

    if (resourceQtyToAdd < match.qty) {
      throw new Error(`Buyer warehouse capacity exceeded. Can only accept ${resourceQtyToAdd} of ${match.qty} units.`);
    }

    const buyerCoinsCurrent = await db.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    ).bind(match.cityIdBuyer, coinsResource.id).first<{ amount: number }>();
    
    const buyerCoinsAmount = Math.max(0, buyerCoinsCurrent?.amount || 0);
    if (buyerCoinsAmount < totalCost) {
      throw new Error('Buyer has insufficient coins');
    }

    const sellerResourceCurrent = await db.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    ).bind(match.cityIdSeller, resourceId).first<{ amount: number }>();
    
    const sellerResourceAmount = Math.max(0, sellerResourceCurrent?.amount || 0);
    if (sellerResourceAmount < match.qty) {
      throw new Error('Seller has insufficient resources');
    }

    const newBuyerCoins = Math.max(0, buyerCoinsAmount - totalCost);
    await db.prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
    )
      .bind(match.cityIdBuyer, coinsResource.id, newBuyerCoins, 0, newBuyerCoins)
      .run();

    const sellerCoinsCurrent = await db.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    ).bind(match.cityIdSeller, coinsResource.id).first<{ amount: number }>();
    
    const sellerCoinsAmount = Math.max(0, sellerCoinsCurrent?.amount || 0);
    const newSellerCoins = Math.max(0, sellerCoinsAmount + sellerReceives);
    await db.prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
    )
      .bind(match.cityIdSeller, coinsResource.id, newSellerCoins, 0, newSellerCoins)
      .run();

    const newSellerResource = Math.max(0, sellerResourceAmount - match.qty);
    await db.prepare(
      `UPDATE city_resources SET amount = ? 
       WHERE city_id = ? AND resource_id = ?`
    )
      .bind(newSellerResource, match.cityIdSeller, resourceId)
      .run();

    const newBuyerResource = Math.max(0, buyerResourceAmount + match.qty);
    await db.prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = ?`
    )
      .bind(match.cityIdBuyer, resourceId, newBuyerResource, 0, newBuyerResource)
      .run();

    await db.prepare(
      'UPDATE market_orders SET qty_filled = qty_filled + ?, last_match_at = ? WHERE id = ?'
    )
      .bind(match.qty, Date.now(), match.buyOrderId)
      .run();

    await db.prepare(
      'UPDATE market_orders SET qty_filled = qty_filled + ?, last_match_at = ? WHERE id = ?'
    )
      .bind(match.qty, Date.now(), match.sellOrderId)
      .run();

    const buyOrder = await db.prepare(
      'SELECT qty, qty_filled FROM market_orders WHERE id = ?'
    )
      .bind(match.buyOrderId)
      .first<{ qty: number; qty_filled: number }>();

    const sellOrder = await db.prepare(
      'SELECT qty, qty_filled FROM market_orders WHERE id = ?'
    )
      .bind(match.sellOrderId)
      .first<{ qty: number; qty_filled: number }>();

    if (buyOrder && buyOrder.qty_filled >= buyOrder.qty) {
      await db.prepare(
        'UPDATE market_orders SET status = ? WHERE id = ?'
      )
        .bind('filled', match.buyOrderId)
        .run();
    }

    if (sellOrder && sellOrder.qty_filled >= sellOrder.qty) {
      await db.prepare(
        'UPDATE market_orders SET status = ? WHERE id = ?'
      )
        .bind('filled', match.sellOrderId)
        .run();
    }

    const tradeId = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO trades (id, buy_order_id, sell_order_id, city_id_buyer, city_id_seller, resource_id, price, qty, fee, tax, traded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        tradeId,
        match.buyOrderId,
        match.sellOrderId,
        match.cityIdBuyer,
        match.cityIdSeller,
        resourceId,
        match.price,
        match.qty,
        transactionFee,
        tax,
        Date.now()
      )
      .run();

    // Deposit tax into council treasury if tax was collected
    if (tax > 0 && normalizedTaxRate > 0) {
      const sellerCityData = await db.prepare(
        'SELECT region_id FROM cities WHERE id = ?'
      )
        .bind(match.cityIdSeller)
        .first<{ region_id: string }>();

      if (sellerCityData) {
        const council = await db.prepare(
          'SELECT id FROM councils WHERE region_id = ? ORDER BY created_at ASC LIMIT 1'
        )
          .bind(sellerCityData.region_id)
          .first<{ id: string }>();

        if (council) {
          await db.prepare(
            'UPDATE councils SET treasury_balance = treasury_balance + ? WHERE id = ?'
          )
            .bind(tax, council.id)
            .run();
        }
      }
    }
  }

  static getMarketDO(env: Env, resourceCode: string): DurableObjectStub {
    const id = env.MARKET.idFromName(`market-${resourceCode}`);
    const stub = env.MARKET.get(id);
    stub.fetch(new Request('https://market/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceCode }),
    })).catch(() => {});
    return stub;
  }
}


