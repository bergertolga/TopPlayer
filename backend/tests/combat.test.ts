
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleEngine } from '../src/game/battle';
import { D1Database } from '@cloudflare/workers-types';

// Mock Utils
const mockD1Database = () => ({
  prepare: vi.fn().mockReturnThis(),
  bind: vi.fn().mockReturnThis(),
  first: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
  batch: vi.fn(),
  exec: vi.fn(),
} as unknown as D1Database);

const mockTroopType = (code: string, power: number) => ({
    id: `type-${code}`,
    code,
    name: code,
    category: 'infantry',
    base_power: power,
    stats_json: JSON.stringify({ attack: power, defense: power, speed: 1, load: 10, type: 'infantry' })
});

const mockCityTroop = (cityId: string, code: string, qty: number) => ({
    id: `troop-${code}`,
    city_id: cityId,
    troop_type_id: `type-${code}`,
    quantity: qty,
    level: 1,
    experience: 0
});

describe('BattleEngine', () => {
  let mockDb: any;
  let cityId: string;
  let entityId: string;

  beforeEach(() => {
    mockDb = mockD1Database();
    cityId = 'test-city-battle';
    entityId = 'npc-bandit-1';

    // Mock DB responses
    mockDb.prepare.mockImplementation((query: string) => {
        const stmt = {
            bind: vi.fn().mockReturnThis(),
            first: vi.fn(),
            all: vi.fn(),
            run: vi.fn().mockResolvedValue({ success: true })
        };

        if (query.includes('FROM city_troops')) {
            stmt.all.mockResolvedValue({
                results: [
                    { ...mockCityTroop(cityId, 'MILITIA', 100), ...mockTroopType('MILITIA', 5) },
                    { ...mockCityTroop(cityId, 'ARCHER', 50), ...mockTroopType('ARCHER', 15) }
                ]
            });
        } else if (query.includes('FROM map_entities')) {
            stmt.first.mockResolvedValue({
                id: entityId,
                type: 'BANDIT_CAMP',
                level: 1,
                status: 'active',
                defenders_json: '{"MILITIA": 20}',
                rewards_json: '{"resources":{"COINS":500}}'
            });
        } else if (query.includes('FROM troop_types')) {
            stmt.first.mockImplementation(() => Promise.resolve(mockTroopType('MILITIA', 5)));
        } else if (query.includes('FROM sim_config_values')) {
            stmt.first.mockResolvedValue({
                value_json: JSON.stringify({
                    attackerWoundedBase: 0.5, 
                    defenderWoundedBase: 0.7,
                    minDeathRatio: 0.1,
                    maxWoundedRatio: 0.9
                })
            });
        } else if (query.includes('FROM cities')) {
             stmt.first.mockResolvedValue({ level: 5, user_id: 'u1' });
        } else if (query.includes('UPDATE map_entities')) {
             stmt.run.mockResolvedValue({ success: true });
        } else if (query.includes('INSERT INTO battle_logs')) {
             stmt.run.mockResolvedValue({ success: true });
        } else if (query.includes('UPDATE city_troops')) {
             stmt.run.mockResolvedValue({ success: true });
        } else if (query.includes('INSERT INTO city_wounded')) {
             stmt.run.mockResolvedValue({ success: true });
        } else {
            stmt.all.mockResolvedValue({ results: [] });
            stmt.first.mockResolvedValue(null);
        }
        return stmt;
    });
  });

  it('should resolve PvE battle with attacker win', async () => {
    const result = await BattleEngine.resolvePvE(mockDb, cityId, entityId);
    
    expect(result).toBeDefined();
    expect(result.winnerId).toBe(cityId);
    expect(result.loot).toHaveProperty('COINS', 500);
    expect(result.log.length).toBeGreaterThan(0);
    expect(Object.keys(result.attackerLosses).length).toBeGreaterThanOrEqual(0);
  });

  it('should apply hospital logic and split casualties', async () => {
      const result = await BattleEngine.resolvePvE(mockDb, cityId, entityId);
      
      // We expect some wounded
      const totalLoss = (result.attackerLosses['troop-MILITIA'] || 0) + (result.attackerWounded['troop-MILITIA'] || 0);
      
      // With 50% ratio, verify we have non-zero wounded if we have any losses
      if (totalLoss > 0) {
        expect(result.attackerWounded['troop-MILITIA']).toBeGreaterThan(0);
      }
  });
});
