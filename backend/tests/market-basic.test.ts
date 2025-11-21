import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestRuntime, type TestRuntime, type MarketTestHarness } from './helpers/runtime';
import { MarketEngine } from '../src/game/market';

const RESOURCE_CODE = 'WOOD';

describe('Market matching basics', () => {
  let runtime: TestRuntime;
  let market: MarketTestHarness;
  let resourceId: string;
  let coinsResourceId: string;

  beforeEach(async () => {
    runtime = await createTestRuntime();
    market = await runtime.newMarketStub(RESOURCE_CODE);
    resourceId = await getResourceId(RESOURCE_CODE);
    coinsResourceId = await getResourceId('COINS');
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it('executes a full match and updates balances without negatives', async () => {
    const buyer = await createCityWithBalances('buyer', { COINS: 10_000 });
    const seller = await createCityWithBalances('seller', { COINS: 500, [RESOURCE_CODE]: 100 });

    const buyOrder = await createOrder(buyer.cityId, 'buy', 5, 40, 1);
    const sellOrder = await createOrder(seller.cityId, 'sell', 5, 40, 2);

    await executeMatches([...buyOrder.matches, ...sellOrder.matches]);

    const buyRow = await getOrder(buyOrder.orderId);
    const sellRow = await getOrder(sellOrder.orderId);
    expect(buyRow?.status).toBe('filled');
    expect(sellRow?.status).toBe('filled');
    expect(buyRow?.qty_filled).toBeCloseTo(40);
    expect(sellRow?.qty_filled).toBeCloseTo(40);

    const buyerCoins = await getResourceAmount(buyer.cityId, coinsResourceId);
    const sellerCoins = await getResourceAmount(seller.cityId, coinsResourceId);
    const sellerResource = await getResourceAmount(seller.cityId, resourceId);
    const buyerResource = await getResourceAmount(buyer.cityId, resourceId);

    expect(buyerCoins).toBeGreaterThanOrEqual(0);
    expect(sellerCoins).toBeGreaterThanOrEqual(0);
    expect(sellerResource).toBeGreaterThanOrEqual(0);
    expect(buyerResource).toBeGreaterThanOrEqual(40);

    const trade = await runtime.db.prepare('SELECT * FROM trades WHERE buy_order_id = ?').bind(buyOrder.orderId).first();
    expect(trade?.qty).toBeCloseTo(40);
    expect(trade?.price).toBeCloseTo(5);
  });

  it('leaves remaining quantity open when only partially filled', async () => {
    const buyer = await createCityWithBalances('bigbuyer', { COINS: 20_000 });
    const seller = await createCityWithBalances('partialseller', { COINS: 100, [RESOURCE_CODE]: 80 });

    const buyOrder = await createOrder(buyer.cityId, 'buy', 6, 100, 1);
    const sellOrder = await createOrder(seller.cityId, 'sell', 6, 40, 2);

    await executeMatches([...buyOrder.matches, ...sellOrder.matches]);

    const buyRow = await getOrder(buyOrder.orderId);
    const sellRow = await getOrder(sellOrder.orderId);

    expect(buyRow?.status).toBe('open');
    expect(buyRow?.qty_filled).toBeCloseTo(40);
    expect(buyRow && buyRow.qty - buyRow.qty_filled).toBeCloseTo(60);
    expect(sellRow?.status).toBe('filled');

    const buyerCoins = await getResourceAmount(buyer.cityId, coinsResourceId);
    const sellerCoins = await getResourceAmount(seller.cityId, coinsResourceId);
    expect(buyerCoins).toBeGreaterThanOrEqual(0);
    expect(sellerCoins).toBeGreaterThanOrEqual(0);
  });

  it('matches earlier orders first when prices tie', async () => {
    const buyer = await createCityWithBalances('fifo-buyer', { COINS: 10_000 });
    const sellerEarly = await createCityWithBalances('early', { COINS: 200, [RESOURCE_CODE]: 50 });
    const sellerLate = await createCityWithBalances('late', { COINS: 200, [RESOURCE_CODE]: 50 });

    const sellEarly = await createOrder(sellerEarly.cityId, 'sell', 4, 30, 1);
    await createOrder(sellerLate.cityId, 'sell', 4, 30, 2);
    const buyOrder = await createOrder(buyer.cityId, 'buy', 4, 30, 3);

    await executeMatches([...sellEarly.matches, ...buyOrder.matches]);

    const fillTrade = await runtime.db
      .prepare('SELECT * FROM trades WHERE buy_order_id = ? ORDER BY traded_at DESC LIMIT 1')
      .bind(buyOrder.orderId)
      .first<{ sell_order_id: string }>();

    expect(fillTrade?.sell_order_id).toBe(sellEarly.orderId);

    const earlyRow = await getOrder(sellEarly.orderId);
    const lateRow = await runtime.db
      .prepare('SELECT * FROM market_orders WHERE city_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(sellerLate.cityId)
      .first<{ status: string; qty_filled: number; qty: number }>();

    expect(earlyRow?.status).toBe('filled');
    expect(lateRow?.status).toBe('open');
    expect(lateRow && lateRow.qty_filled).toBe(0);
  });

  async function createUser(username: string): Promise<string> {
    const userId = randomUUID();
    const now = Date.now();
    await runtime.db.prepare(
      'INSERT INTO users (id, username, email, created_at, last_active, total_spent, prestige_count, server_region) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(userId, username, `${username}@test`, now, now, 0, 0, 'global')
      .run();
    return userId;
  }

  async function createCityWithBalances(
    label: string,
    balances: Record<string, number>
  ): Promise<{ cityId: string; userId: string }> {
    const userId = await createUser(`${label}_user`);
    const cityId = randomUUID();
    const now = Date.now();
    await runtime.db.prepare(
      'INSERT INTO cities (id, user_id, region_id, name, level, population, happiness, last_tick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(cityId, userId, 'region-heartlands', `${label}-city`, 5, 100, 0.9, now, now)
      .run();

    for (const [code, amount] of Object.entries(balances)) {
      const resId = await getResourceId(code);
      await runtime.db.prepare(
        `INSERT INTO city_resources (city_id, resource_id, amount, protected)
         VALUES (?, ?, ?, 0)
         ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = excluded.amount`
      )
        .bind(cityId, resId, amount)
        .run();
    }

    await ensureWarehouseBuilding(cityId, 6);
    return { cityId, userId };
  }

  async function getResourceId(code: string): Promise<string> {
    const resource = await runtime.db.prepare('SELECT id FROM resources WHERE code = ?').bind(code).first<{ id: string }>();
    if (!resource) {
      throw new Error(`Resource ${code} not found`);
    }
    return resource.id;
  }

  async function getOrder(orderId: string) {
    return runtime.db
      .prepare('SELECT status, qty, qty_filled FROM market_orders WHERE id = ?')
      .bind(orderId)
      .first<{ status: string; qty: number; qty_filled: number }>();
  }

  async function getResourceAmount(cityId: string, resourceId: string): Promise<number> {
    const row = await runtime.db
      .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
      .bind(cityId, resourceId)
      .first<{ amount: number }>();
    return Math.max(0, row?.amount || 0);
  }

  async function createOrder(
    cityId: string,
    side: 'buy' | 'sell',
    price: number,
    qty: number,
    createdAtSeed: number
  ): Promise<{ orderId: string; matches: any[] }> {
    const orderId = randomUUID();
    const createdAt = Date.now() + createdAtSeed;
    await runtime.db.prepare(
      'INSERT INTO market_orders (id, city_id, resource_id, side, price, qty, qty_filled, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(orderId, cityId, resourceId, side, price, qty, 0, 'open', createdAt)
      .run();

    const response = await market.placeOrder({ orderId, cityId, side, price, qty, createdAt });
    const matches = response.matches || [];
    return { orderId, matches };
  }

  async function executeMatches(matches: any[]) {
    if (!matches.length) {
      return;
    }
    for (const match of matches) {
      await MarketEngine.executeTrade(runtime.db, match, resourceId, 0);
    }
  }

  async function ensureWarehouseBuilding(cityId: string, level: number) {
    const buildingId = await getBuildingId('WAREHOUSE');
    const now = Date.now();
    await runtime.db.prepare(
      `INSERT INTO city_buildings (city_id, building_id, level, workers, is_active, last_production)
       VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(city_id, building_id) DO UPDATE SET level = excluded.level, is_active = 1`
    )
      .bind(cityId, buildingId, level, 0, now)
      .run();
  }

  async function getBuildingId(code: string): Promise<string> {
    const row = await runtime.db.prepare('SELECT id FROM buildings WHERE code = ?').bind(code).first<{ id: string }>();
    if (!row) {
      throw new Error(`Building ${code} not found`);
    }
    return row.id;
  }
});

