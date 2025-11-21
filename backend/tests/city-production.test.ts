import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestRuntime, createCityState, type TestRuntime } from './helpers/runtime';
import type { Command } from '../src/types/kingdoms-persist';
import { DEFAULT_BUILD_TIME_TICKS } from '../src/durable-objects/city-do';

describe('CityDO resource production', () => {
  let runtime: TestRuntime | undefined;

  beforeEach(async () => {
    runtime = await createTestRuntime();
  });

  afterEach(async () => {
    if (runtime) {
      await runtime.dispose();
      runtime = undefined;
    }
  });

  it('applies baseline production per tick without going negative', async () => {
    const initialState = createCityState();
    const city = await runtime!.newCityStub(initialState);

    const nextState = await city.processTick();

    const laborUpkeep = (initialState.labor.free * 0.25) / 8640;
    expect(nextState.resources.grain).toBeCloseTo(initialState.resources.grain + 10 - laborUpkeep, 3);
    expect(nextState.resources.timber).toBeCloseTo(initialState.resources.timber + 8, 5);
    expect(nextState.resources.stone).toBeCloseTo(initialState.resources.stone + 5, 5);
    expect(nextState.resources.coins).toBeCloseTo(initialState.resources.coins + 5, 5);

    for (const value of Object.values(nextState.resources)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it('adds building-specific bonuses on top of base production', async () => {
    const initialState = createCityState({
      buildings: [
        { id: 'b_farm_1', lvl: 2, slot: 1 },
        { id: 'b_lumber_mill_2', lvl: 1, slot: 2 },
        { id: 'b_quarry_3', lvl: 3, slot: 3 },
        { id: 'b_market_4', lvl: 2, slot: 4 },
      ],
    });
    const city = await runtime!.newCityStub(initialState);

    const nextState = await city.processTick();
    const laborUpkeep = (initialState.labor.free * 0.25) / 8640;

    expect(nextState.resources.grain).toBeCloseTo(initialState.resources.grain + 10 + 2 * 5 - laborUpkeep, 3);
    expect(nextState.resources.timber).toBeCloseTo(initialState.resources.timber + 8 + 1 * 4, 3);
    expect(nextState.resources.stone).toBeCloseTo(initialState.resources.stone + 5 + 3 * 3, 3);
    expect(nextState.resources.coins).toBeCloseTo(initialState.resources.coins + 5 + 2 * 2, 3);
  });

  it('never lets upkeep drop resources below zero', async () => {
    const initialState = createCityState({
      resources: { grain: 0, rations: 0, coins: 10, timber: 0, stone: 0 },
      labor: { free: 200, assigned: {} },
      units: { worker: 500 },
    });
    const city = await runtime!.newCityStub(initialState);

    const nextState = await city.processTick();

    expect(nextState.resources.grain).toBeGreaterThanOrEqual(0);
    expect(nextState.resources.rations).toBeGreaterThanOrEqual(0);
  });

  it('resolves build queues after the configured number of ticks and in order', async () => {
    const now = runtime!.clock.now();
    const buildCommands: Command[] = [
      { type: 'BUILD', building: 'farm', slot: 5, client_time: now },
      { type: 'BUILD', building: 'market', slot: 6, client_time: now + 1 },
    ];
    const richState = createCityState({
      resources: { grain: 500, timber: 500, stone: 500, coins: 5000, rations: 0 },
    });
    const city = await runtime!.newCityStub(richState, { commandQueue: buildCommands });

    let farmCompleteTick: number | undefined;
    let marketCompleteTick: number | undefined;

    for (let i = 0; i < 20; i++) {
      await city.processTick();
      const snapshot = await city.getState();

      if (!farmCompleteTick && snapshot.buildings.some(b => b.slot === 5)) {
        farmCompleteTick = snapshot.ticks;
        expect(snapshot.buildings.some(b => b.slot === 6)).toBe(false);
      }

      if (!marketCompleteTick && snapshot.buildings.some(b => b.slot === 6)) {
        marketCompleteTick = snapshot.ticks;
      }

      if (farmCompleteTick && marketCompleteTick) {
        break;
      }
    }

    expect(farmCompleteTick).toBeDefined();
    expect(marketCompleteTick).toBeDefined();
    expect(farmCompleteTick!).toBeLessThan(marketCompleteTick!);

    const finalState = await city.getState();
    expect(finalState.queues.build.length).toBe(0);
  });
});

