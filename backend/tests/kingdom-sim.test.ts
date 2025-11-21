/**
 * Smoke-test integration for the macro loop:
 * city production ticks → market trading → council taxation.
 * This is not a balance test, only a stability + invariant check.
 */
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createTestRuntime, createCityState, type CityTestHarness, type MarketTestHarness, type TestRuntime } from './helpers/runtime';
import { MarketEngine } from '../src/game/market';

const REGION_ID = 'region-heartlands';
const RESOURCE_CODE = 'WOOD';
const PRICE = 4;
const TRADE_QTY = 5;
const ROUNDS = 10;
const TAX_RATE = 0.04;
const ROUNDING = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

describe('Kingdom integration simulation', () => {
  let runtime: TestRuntime;
  let market: MarketTestHarness;
  let resourceId: string;
  let coinsResourceId: string;
  let warehouseBuildingId: string;

  beforeEach(async () => {
    runtime = await createTestRuntime();
    market = await runtime.newMarketStub(RESOURCE_CODE);
    resourceId = await getResourceId(RESOURCE_CODE);
    coinsResourceId = await getResourceId('COINS');
    warehouseBuildingId = await getBuildingId('WAREHOUSE');
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it('keeps cities solvent while council treasury grows over multiple ticks & trades', async () => {
    const councilId = await createCouncil('sim-council', REGION_ID, TAX_RATE);

    const seller = await createCityWithBalances('seller-city', {
      COINS: 500,
      [RESOURCE_CODE]: 150,
    });
    const buyer = await createCityWithBalances('buyer-city', {
      COINS: 5_000,
      [RESOURCE_CODE]: 10,
    });

    const sellerCityDO = await runtime.newCityStub(
      createCityStateForResources({ coins: 500, wood: 150 }, [
        { id: 'b_farm_1', lvl: 2, slot: 1 },
        { id: 'b_lumber_mill_2', lvl: 2, slot: 2 },
      ]),
      { name: seller.cityId }
    );
    const buyerCityDO = await runtime.newCityStub(
      createCityStateForResources({ coins: 5_000, wood: 10 }),
      { name: buyer.cityId }
    );

    await ensureWarehouse(seller.cityId);
    await ensureWarehouse(buyer.cityId);

    const initialSellerWood = await getCityResourceAmount(seller.cityId, resourceId);
    const initialBuyerWood = await getCityResourceAmount(buyer.cityId, resourceId);
    let expectedTax = 0;

    for (let round = 0; round < ROUNDS; round++) {
      await sellerCityDO.processTick({ ticks: 1 });
      await buyerCityDO.processTick({ ticks: 1 });
      await syncDbFromCity(sellerCityDO, seller.cityId, ['WOOD', 'COINS']);
      await syncDbFromCity(buyerCityDO, buyer.cityId, ['WOOD', 'COINS']);

      const sellerWood = await getCityResourceAmount(seller.cityId, resourceId);
      const buyerCoins = await getCityResourceAmount(buyer.cityId, coinsResourceId);
      const tradeCost = ROUNDING(PRICE * TRADE_QTY * (1 + TAX_RATE + 0.01));
      if (sellerWood < TRADE_QTY || buyerCoins < tradeCost) {
        continue;
      }

      const matches = await createMatchedTrade(buyer.cityId, seller.cityId, PRICE, TRADE_QTY, round * 10);
      await executeMatches(matches, TAX_RATE);
      expectedTax += ROUNDING(PRICE * TRADE_QTY * TAX_RATE);

      await syncCityFromDb(sellerCityDO, seller.cityId, ['WOOD', 'COINS']);
      await syncCityFromDb(buyerCityDO, buyer.cityId, ['WOOD', 'COINS']);
    }

    const finalSellerWood = await getCityResourceAmount(seller.cityId, resourceId);
    const finalBuyerWood = await getCityResourceAmount(buyer.cityId, resourceId);
    const sellerCoins = await getCityResourceAmount(seller.cityId, coinsResourceId);
    const buyerCoins = await getCityResourceAmount(buyer.cityId, coinsResourceId);
    const councilTreasury = await getCouncilTreasury(councilId);

    expect(Number.isFinite(finalSellerWood)).toBe(true);
    expect(Number.isFinite(finalBuyerWood)).toBe(true);
    expect(Number.isFinite(sellerCoins)).toBe(true);
    expect(Number.isFinite(buyerCoins)).toBe(true);
    expect(Number.isFinite(councilTreasury)).toBe(true);

    expect(finalSellerWood).toBeLessThan(initialSellerWood);
    expect(finalBuyerWood).toBeGreaterThan(initialBuyerWood);
    expect(sellerCoins).toBeGreaterThanOrEqual(0);
    expect(buyerCoins).toBeGreaterThanOrEqual(0);
    expect(finalSellerWood).toBeGreaterThanOrEqual(0);
    expect(finalBuyerWood).toBeGreaterThanOrEqual(0);

    expect(councilTreasury).toBeGreaterThan(0);
    expect(councilTreasury).toBeLessThanOrEqual(ROUNDING(expectedTax + 0.01));
    expect(councilTreasury).toBeCloseTo(expectedTax, 2);
  });

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

  async function createCityWithBalances(label: string, resources: Record<string, number>) {
    const userId = await createUser(`${label}_user`);
    const cityId = randomUUID();
    const now = Date.now();
    await runtime.db.prepare(
      'INSERT INTO cities (id, user_id, region_id, name, level, population, happiness, last_tick, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(cityId, userId, REGION_ID, `${label}`, 5, 120, 0.9, now, now)
      .run();

    for (const [code, amount] of Object.entries(resources)) {
      const resId = await getResourceId(code);
      await upsertCityResource(cityId, resId, amount);
    }

    return { cityId, userId };
  }

  async function ensureWarehouse(cityId: string) {
    const now = Date.now();
    await runtime.db.prepare(
      `INSERT INTO city_buildings (city_id, building_id, level, workers, is_active, last_production)
       VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT(city_id, building_id) DO UPDATE SET level = excluded.level, is_active = 1`
    )
      .bind(cityId, warehouseBuildingId, 6, 0, now)
      .run();
  }

  function createCityStateForResources(resources: Record<string, number>, buildings: Array<{ id: string; lvl: number; slot: number }> = []) {
    return createCityState({
      resources,
      buildings,
    });
  }

  async function createMatchedTrade(buyerCityId: string, sellerCityId: string, price: number, qty: number, timeOffset: number) {
    const buy = await createOrder(buyerCityId, 'buy', price, qty, timeOffset + 1);
    const sell = await createOrder(sellerCityId, 'sell', price, qty, timeOffset + 2);
    return [...buy.matches, ...sell.matches];
  }

  async function createOrder(cityId: string, side: 'buy' | 'sell', price: number, qty: number, createdAtSeed: number) {
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

  async function syncDbFromCity(city: CityTestHarness, cityId: string, resourceCodes: string[]) {
    const state = await city.getState();
    for (const code of resourceCodes) {
      const amount = Math.max(0, state.resources[code.toLowerCase()] || 0);
      const resId = await getResourceId(code);
      await upsertCityResource(cityId, resId, amount);
    }
  }

  async function syncCityFromDb(city: CityTestHarness, cityId: string, resourceCodes: string[]) {
    const state = await city.getState();
    let changed = false;
    for (const code of resourceCodes) {
      const resId = await getResourceId(code);
      const dbAmount = await getCityResourceAmount(cityId, resId);
      const key = code.toLowerCase();
      if (state.resources[key] !== dbAmount) {
        state.resources[key] = dbAmount;
        changed = true;
      }
    }
    if (changed) {
      await city.setState(state);
    }
  }

  async function getCityResourceAmount(cityId: string, resourceId: string): Promise<number> {
    const row = await runtime.db.prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?')
      .bind(cityId, resourceId)
      .first<{ amount: number }>();
    return Math.max(0, row?.amount || 0);
  }

  async function upsertCityResource(cityId: string, resourceId: string, amount: number) {
    await runtime.db.prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = excluded.amount`
    )
      .bind(cityId, resourceId, amount)
      .run();
  }

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

  async function getCouncilTreasury(councilId: string): Promise<number> {
    const row = await runtime.db.prepare('SELECT treasury_balance FROM councils WHERE id = ?').bind(councilId).first<{ treasury_balance: number }>();
    return ROUNDING(row?.treasury_balance || 0);
  }

  async function getResourceId(code: string): Promise<string> {
    const res = await runtime.db.prepare('SELECT id FROM resources WHERE code = ?').bind(code).first<{ id: string }>();
    if (!res) {
      throw new Error(`Resource ${code} not found`);
    }
    return res.id;
  }

  async function getBuildingId(code: string): Promise<string> {
    const row = await runtime.db.prepare('SELECT id FROM buildings WHERE code = ?')
      .bind(code)
      .first<{ id: string }>();
    if (!row) {
      throw new Error(`Building ${code} not found`);
    }
    return row.id;
  }
});

