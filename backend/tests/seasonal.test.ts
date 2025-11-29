
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SeasonManager } from '../src/game/seasons';
import { CityManager } from '../src/game/city';

// Mock D1 Database
const mockDb = {
  prepare: vi.fn(),
};

// Mock ConfigLoader
vi.mock('../src/utils/config', () => ({
  ConfigLoader: {
    getBalanceRules: vi.fn().mockResolvedValue({
      production: { baseMultiplierPerLevel: 0.15 },
      happiness: { min: 0.0, max: 1.0, foodDeficitPenalty: -0.1 },
      refining: { baseEfficiency: 0.9, efficiencyPerLevel: 0.02 },
      warehouse: { baseCapacity: 5000, capacityMultiplier: 1.5 },
    }),
    getActiveSeason: vi.fn().mockResolvedValue({
       instance: { season_number: 1 },
       rules: { productionMultiplier: 1.2, happinessDecay: 0.05 }
    })
  },
}));

// Mock SeasonManager directly for City tests to avoid full DB overhead
vi.mock('../src/game/seasons', () => ({
  SeasonManager: {
    getActiveSeason: vi.fn().mockResolvedValue({
      instance: { season_number: 1, id: 'test-season' },
      rules: { productionMultiplier: 1.2, happinessDecay: 0.05, crisisThresholds: { FOOD: 100 } }
    }),
    checkSeasonTransition: vi.fn(),
  }
}));


describe('Seasonal Mechanics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply seasonal production multiplier', async () => {
     // Setup mock city
     const mockCity = {
         happiness: 1.0,
         region_id: 'reg1',
         user_id: 'user1',
         population: 100
     };
     
     // Mock DB responses
     mockDb.prepare.mockImplementation((query) => {
         if (query.includes('FROM cities')) return { bind: () => ({ first: () => Promise.resolve(mockCity) }) };
         if (query.includes('FROM regions')) return { bind: () => ({ first: () => Promise.resolve({}) }) };
         if (query.includes('FROM city_buildings')) return { 
             bind: () => ({ 
                 all: () => Promise.resolve({ results: [
                     { 
                         code: 'FARM', 
                         level: 1, 
                         base_production_json: '{"FOOD":10}',
                         building_id: 'b1'
                     },
                     {
                         code: 'WAREHOUSE',
                         level: 1
                     }
                 ] }) 
             }) 
         };
         // FIX: Return enough food to avoid famine crisis (threshold 100)
         if (query.includes('FROM city_resources')) return { bind: () => ({ all: () => Promise.resolve({ results: [{ resource_id: 'res-food', amount: 200 }] }) }) };
         if (query.includes('SELECT code FROM resources')) return { bind: () => ({ first: () => Promise.resolve({ code: 'FOOD' }) }) };
         
         if (query.includes('FROM user_heroes')) return { bind: () => ({ all: () => Promise.resolve({ results: [] }) }) };
         if (query.includes('FROM city_troops')) return { bind: () => ({ all: () => Promise.resolve({ results: [] }) }) };
         if (query.includes('FROM city_governors')) return { bind: () => ({ first: () => Promise.resolve(null) }) };
         
         return { bind: () => ({ first: () => Promise.resolve(null), all: () => Promise.resolve({ results: [] }), run: () => Promise.resolve() }) };
     });

     const result = await CityManager.processCityTick(mockDb as any, 'city1', 1000);
     
     // Calculation Breakdown:
     // 1. Production:
     //    Base: 10
     //    Modifiers: Happiness 1.0 -> 1.2 multiplier
     //    Season: 1.2 multiplier
     //    Gross Production = 10 * 1.2 * 1.2 = 14.4 -> floor(14)
     //
     // 2. Consumption:
     //    Population: 100
     //    Food Consumption: 100 * 0.1 = 10
     //
     // 3. Net Delta:
     //    14 - 10 = 4
     //
     // Without Season: 10 * 1.2 = 12 -> 12 - 10 = 2.
     // So we expect 4.
     
     expect(result.delta['FOOD']).toBe(4);
  });

  it('should trigger crisis on low food', async () => {
     // Mock city resources to have 0 FOOD
     const mockCity = { happiness: 1.0, region_id: 'reg1', user_id: 'user1', population: 100 };
     
     mockDb.prepare.mockImplementation((query) => {
         if (query.includes('FROM cities')) return { bind: () => ({ first: () => Promise.resolve(mockCity) }) };
         if (query.includes('FROM regions')) return { bind: () => ({ first: () => Promise.resolve({}) }) };
         if (query.includes('FROM city_buildings')) return { 
             bind: () => ({ all: () => Promise.resolve({ results: [{ code: 'FARM', level: 1, base_production_json: '{"FOOD":10}', building_id: 'b1' }, { code: 'WAREHOUSE', level: 1 }] }) }) 
         };
         if (query.includes('FROM city_resources')) return { 
             bind: () => ({ all: () => Promise.resolve({ results: [{ resource_id: 'res-food', amount: 50 }] }) }) // 50 < 100 threshold
         };
         if (query.includes('SELECT code FROM resources')) return { bind: () => ({ first: () => Promise.resolve({ code: 'FOOD' }) }) };
          if (query.includes('FROM user_heroes')) return { bind: () => ({ all: () => Promise.resolve({ results: [] }) }) };
         if (query.includes('FROM city_troops')) return { bind: () => ({ all: () => Promise.resolve({ results: [] }) }) };
         if (query.includes('FROM city_governors')) return { bind: () => ({ first: () => Promise.resolve(null) }) };

         return { bind: () => ({ first: () => Promise.resolve(null), all: () => Promise.resolve({ results: [] }), run: () => Promise.resolve() }) };
     });

     const result = await CityManager.processCityTick(mockDb as any, 'city1', 1000);
     
     // Expect crisis note
     expect(result.notes).toEqual(expect.arrayContaining([expect.stringContaining('CRISIS')]));
     
     // Expect halved production due to crisis
     // Normal ~14, Crisis (0.5) -> ~7
     expect(result.delta['FOOD']).toBeLessThan(10);
  });
});

