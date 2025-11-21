import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestRuntime, createCityState, type TestRuntime } from './helpers/runtime';

describe('CityDO long-running simulation', () => {
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

  it('maintains resource invariants across 180 ticks', async () => {
    const initialState = createCityState({
      buildings: [
        { id: 'b_farm_1', lvl: 2, slot: 1 },
        { id: 'b_lumber_mill_2', lvl: 2, slot: 2 },
        { id: 'b_market_3', lvl: 1, slot: 3 },
      ],
    });
    const city = await runtime!.newCityStub(initialState);

    const totalTicks = 180;
    for (let i = 0; i < totalTicks; i++) {
      await city.processTick();
    }

    const finalState = await city.getState();

    expect(finalState.ticks).toBe(totalTicks);
    expect(finalState.queues.build.length).toBe(0);
    expect(finalState.queues.train.length).toBe(0);

    for (const value of Object.values(finalState.resources)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }

    expect(finalState.buildings.length).toBe(initialState.buildings.length);
    expect(finalState.resources.coins).toBeGreaterThan(initialState.resources.coins);
    expect(finalState.resources.grain).toBeGreaterThan(initialState.resources.grain);
  });
});

