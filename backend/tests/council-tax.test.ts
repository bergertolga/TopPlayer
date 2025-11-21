import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestRuntime, type TestRuntime, type MarketTestHarness } from './helpers/runtime';
import { MarketEngine } from '../src/game/market';

const RESOURCE_CODE = 'WOOD';
const REGION_ID = 'region-heartlands';
const TRANSACTION_FEE_RATE = 0.01;

const roundCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

describe('Council tax integration', () => {
  let runtime: TestRuntime;
  let market: MarketTestHarness;
  let resourceId: string;
  let coinsResourceId: string;

  beforeEach(async () => {
    runtime = await createTestRuntime();
    market = await runtime.newMarketStub(RESOURCE_CODE);
    resourceId = await getResourceId(RESOURCE_CODE);
    coinsResourceId = await getResourceId('COINS');
    await runtime.db.prepare('DELETE FROM councils').run();
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it('routes tax proceeds into the owning council treasury', async () => {
    const taxRate = 0.04;
    const councilId = await createCouncil('tax-flow', REGION_ID, taxRate);

    const buyerStartCoins = 10_000;
    const sellerStartCoins = 0;
    const buyer = await createCityWithBalances('buyer-tax', { COINS: buyerStartCoins });
    const seller = await createCityWithBalances('seller-tax', { COINS: sellerStartCoins, [RESOURCE_CODE]: 100 });

    const price = 5;
    const qty = 40;
    const matches = await createMatchedTrade(buyer.cityId, seller.cityId, price, qty);
    await executeMatches(matches, taxRate);

    const gross = price * qty;
    const fee = roundCurrency(gross * TRANSACTION_FEE_RATE);
    const tax = roundCurrency(gross * taxRate);
    const expectedBuyerCoins = buyerStartCoins - roundCurrency(gross + fee + tax);
    const expectedSellerCoins = sellerStartCoins + roundCurrency(gross - fee - tax);

    const buyerCoins = await getResourceAmount(buyer.cityId, coinsResourceId);
    const sellerCoins = await getResourceAmount(seller.cityId, coinsResourceId);
    const sellerResource = await getResourceAmount(seller.cityId, resourceId);
    const buyerResource = await getResourceAmount(buyer.cityId, resourceId);
    const treasury = await getCouncilTreasury(councilId);

    expect(buyerCoins).toBeCloseTo(expectedBuyerCoins);
    expect(sellerCoins).toBeCloseTo(expectedSellerCoins);
    expect(sellerResource).toBeGreaterThanOrEqual(60);
    expect(buyerResource).toBeGreaterThanOrEqual(40);
    expect(treasury).toBeCloseTo(tax);
    expect(buyerCoins).toBeGreaterThanOrEqual(0);
    expect(sellerCoins).toBeGreaterThanOrEqual(0);
  });

  it('accumulates taxation over multiple trades without rounding drift', async () => {
    const taxRate = 0.05;
    const councilId = await createCouncil('tax-loop', REGION_ID, taxRate);

    const buyer = await createCityWithBalances('buyer-loop', { COINS: 20_000 });
    const seller = await createCityWithBalances('seller-loop', { COINS: 500, [RESOURCE_CODE]: 500 });

    const trades = [
      { price: 3, qty: 10 },
      { price: 4, qty: 15 },
      { price: 6, qty: 20 },
    ];

    let expectedTaxTotal = 0;
    for (let i = 0; i < trades.length; i++) {
      const trade = trades[i];
      const matches = await createMatchedTrade(buyer.cityId, seller.cityId, trade.price, trade.qty, i * 10);
      await executeMatches(matches, taxRate);
      expectedTaxTotal += roundCurrency(trade.price * trade.qty * taxRate);
    }

    const treasury = await getCouncilTreasury(councilId);
    expect(treasury).toBeCloseTo(roundCurrency(expectedTaxTotal));

    const buyerCoins = await getResourceAmount(buyer.cityId, coinsResourceId);
    const sellerCoins = await getResourceAmount(seller.cityId, coinsResourceId);
    expect(buyerCoins).toBeGreaterThanOrEqual(0);
    expect(sellerCoins).toBeGreaterThanOrEqual(0);
  });

  it('supports zero and high tax rates without negative balances', async () => {
    const zeroCouncil = await createCouncil('tax-zero', REGION_ID, 0);
    const highRegion = 'region-coast';
    const highCouncil = await createCouncil('tax-high', highRegion, 0.05);

    const buyerZero = await createCityWithBalances('buyer-zero', { COINS: 5_000 });
    const sellerZero = await createCityWithBalances('seller-zero', { COINS: 0, [RESOURCE_CODE]: 100 });
    const zeroMatch = await createMatchedTrade(buyerZero.cityId, sellerZero.cityId, 4, 20);
    await executeMatches(zeroMatch, 0);
    expect(await getCouncilTreasury(zeroCouncil)).toBeCloseTo(0);
    expect(await getResourceAmount(buyerZero.cityId, coinsResourceId)).toBeGreaterThanOrEqual(0);
    expect(await getResourceAmount(sellerZero.cityId, coinsResourceId)).toBeGreaterThanOrEqual(0);

    const buyerHigh = await createCityWithBalances('buyer-high', { COINS: 5_000 }, highRegion);
    const sellerHigh = await createCityWithBalances('seller-high', { COINS: 0, [RESOURCE_CODE]: 100 }, highRegion);
    const highMatch = await createMatchedTrade(buyerHigh.cityId, sellerHigh.cityId, 4, 20);
    await executeMatches(highMatch, 0.05);

    const gross = 80;
    const fee = roundCurrency(gross * TRANSACTION_FEE_RATE);
    const tax = roundCurrency(gross * 0.05);
    const treasury = await getCouncilTreasury(highCouncil);
    expect(treasury).toBeCloseTo(tax);

    const buyerCoins = await getResourceAmount(buyerHigh.cityId, coinsResourceId);
    const sellerCoins = await getResourceAmount(sellerHigh.cityId, coinsResourceId);
    expect(buyerCoins).toBeGreaterThanOrEqual(0);
    expect(sellerCoins).toBeCloseTo(gross - fee - tax);
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
    balances: Record<string, number>,
    regionId: string = REGION_ID
  ): Promise<{ cityId: string; userId: string }> {
    const userId = await createUser(`${label}_user`);
    const cityId = randomUUID();
    const now = Date.now();
    await runtime.db.prepare(
      'INSERT INTO cities (id, user_id, region_id, name, level, population, happiness, last_tick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(cityId, userId, regionId, `${label}-city`, 5, 100, 0.9, now, now)
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

  async function createCouncil(name: string, regionId: string, taxRate: number): Promise<string> {
    const stewardId = await createUser(`${name}-steward`);
    const councilId = randomUUID();
    const now = Date.now();
    await runtime.db.prepare(
      'INSERT INTO councils (id, name, steward_user_id, region_id, tax_rate, treasury_balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(councilId, `${name}-${councilId.slice(0, 6)}`, stewardId, regionId, taxRate, 0, now)
      .run();
    return councilId;
  }

  async function getCouncilTreasury(councilId: string): Promise<number> {
    const row = await runtime.db.prepare('SELECT treasury_balance FROM councils WHERE id = ?').bind(councilId).first<{ treasury_balance: number }>();
    return roundCurrency(row?.treasury_balance || 0);
  }

  async function getResourceId(code: string): Promise<string> {
    const resource = await runtime.db.prepare('SELECT id FROM resources WHERE code = ?').bind(code).first<{ id: string }>();
    if (!resource) {
      throw new Error(`Resource ${code} not found`);
    }
    return resource.id;
  }

  async function getResourceAmount(cityId: string, resourceId: string): Promise<number> {
    const row = await runtime.db
      .prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
      .bind(cityId, resourceId)
      .first<{ amount: number }>();
    return Math.max(0, row?.amount || 0);
  }

  async function createMatchedTrade(
    buyerCityId: string,
    sellerCityId: string,
    price: number,
    qty: number,
    timeOffset: number = 0
  ): Promise<any[]> {
    const buy = await createOrder(buyerCityId, 'buy', price, qty, timeOffset + 1);
    const sell = await createOrder(sellerCityId, 'sell', price, qty, timeOffset + 2);
    return [...buy.matches, ...sell.matches];
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
    return { orderId, matches: response.matches || [] };
  }

  async function executeMatches(matches: any[], taxRate: number) {
    for (const match of matches) {
      await MarketEngine.executeTrade(runtime.db, match, resourceId, taxRate);
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

