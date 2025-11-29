
import { D1Database } from '@cloudflare/workers-types';
import { ArmyManager, CityTroop, TroopType } from './army';

export interface BattleResult {
  winnerId: string | null; // null for draw
  attackerLosses: Record<string, number>; // troopId -> quantity lost (dead + wounded)
  defenderLosses: Record<string, number>;
  attackerWounded: Record<string, number>; // troopId -> quantity wounded (saved)
  defenderWounded: Record<string, number>;
  loot: Record<string, number>;
  log: string[];
}

export interface CombatUnit {
  troopId: string;
  typeId: string;
  code: string;
  quantity: number;
  stats: {
    attack: number;
    defense: number;
    speed: number;
    load: number;
    type: 'infantry' | 'ranged' | 'cavalry' | 'siege';
  };
}

interface CasualtyRatios {
  attackerWoundedBase: number;
  defenderWoundedBase: number;
  minDeathRatio: number;
  maxWoundedRatio: number;
}

export class BattleEngine {
  // Defaults in case config is missing
  private static readonly DEFAULT_RATIOS: CasualtyRatios = {
    attackerWoundedBase: 0.25,
    defenderWoundedBase: 0.70,
    minDeathRatio: 0.10,
    maxWoundedRatio: 0.90
  };

  static async resolvePvE(
    db: D1Database,
    attackerCityId: string,
    targetEntityId: string
  ): Promise<BattleResult> {
    const log: string[] = [];
    
    // 1. Fetch Attacker Army
    const attackerTroops = await this.getCityCombatUnits(db, attackerCityId);
    
    // 2. Fetch Defender (Map Entity)
    const entity = await db.prepare(`SELECT * FROM map_entities WHERE id = ?`).bind(targetEntityId).first<any>();
    if (!entity || entity.status !== 'active') {
      throw new Error('Target invalid or already defeated');
    }

    const defenderUnitsRaw = JSON.parse(entity.defenders_json); 
    const defenderUnits: CombatUnit[] = [];
    
    // Resolve defender stats
    for (const [code, qty] of Object.entries(defenderUnitsRaw)) {
        const type = await db.prepare(`SELECT * FROM troop_types WHERE code = ?`).bind(code).first<TroopType & { stats_json?: string }>();
        if (type) {
             const stats = type.stats_json ? JSON.parse(type.stats_json as unknown as string) : { attack: type.basePower, defense: type.basePower, speed: 1, load: 0, type: 'infantry' };
             defenderUnits.push({
                 troopId: `npc-${code}`,
                 typeId: type.id,
                 code: type.code,
                 quantity: Number(qty),
                 stats
             });
        }
    }

    log.push(`Battle started against ${entity.type} (Level ${entity.level})`);
    log.push(`Attacker: ${attackerTroops.reduce((sum, u) => sum + u.quantity, 0)} units`);
    log.push(`Defender: ${defenderUnits.reduce((sum, u) => sum + u.quantity, 0)} units`);

    // 3. Simulate Combat
    const { winner, attackerLosses, defenderLosses } = this.simulateCombat(attackerTroops, defenderUnits, log);

    // 4. Casualty Processing (Hospital)
    // Fetch Config Ratios
    // Optimization: In a real app, load this once or cache it.
    const configRow = await db.prepare("SELECT value_json FROM sim_config_values WHERE key = 'casualty_ratios'").first<{ value_json: string }>();
    const ratios = configRow ? JSON.parse(configRow.value_json) : this.DEFAULT_RATIOS;

    // Attacker Processing
    const attackerCapacity = await this.getHospitalCapacity(db, attackerCityId);
    const attackerBuffs = await this.getCityBuffs(db, attackerCityId); // e.g. { woundedRatio: 0.1 }
    const attackerSplit = this.splitCasualties(attackerLosses, true, ratios, attackerCapacity, attackerBuffs);
    
    // Defender Processing (NPC usually has no hospital, but if PVP we'd do it)
    // For PvE, defender (NPC) simply dies.
    const defenderSplit = { dead: defenderLosses, wounded: {} };

    // 5. Loot Calculation
    let loot: Record<string, number> = {};
    if (winner === 'attacker') {
        const rewards = JSON.parse(entity.rewards_json);
        if (rewards.resources) {
            // Calculate load capacity of SURVIVORS (Total - Dead - Wounded? Usually wounded don't carry)
            const survivingCapacity = attackerTroops.reduce((cap, u) => {
                const dead = attackerSplit.dead[u.troopId] || 0;
                const wounded = attackerSplit.wounded[u.troopId] || 0;
                const survivors = Math.max(0, u.quantity - dead - wounded);
                return cap + (survivors * (u.stats.load || 0));
            }, 0);
            
            loot = this.calculateLoot(rewards.resources, survivingCapacity);
        }
        
        // Mark entity as defeated
        await db.prepare(`
            UPDATE map_entities 
            SET status = 'defeated', defeated_at = ?, defeated_by_user_id = (SELECT user_id FROM cities WHERE id = ?)
            WHERE id = ?
        `).bind(Date.now(), attackerCityId, targetEntityId).run();
    }

    // 6. Persist Attacker Changes
    // Remove dead AND wounded from active army
    const totalRemoved: Record<string, number> = {};
    for (const id of Object.keys(attackerLosses)) {
        totalRemoved[id] = (attackerSplit.dead[id] || 0) + (attackerSplit.wounded[id] || 0);
    }
    await this.applyLosses(db, attackerCityId, totalRemoved);
    
    // Add wounded to hospital
    await this.enqueueWounded(db, attackerCityId, attackerSplit.wounded, attackerTroops);

    // 7. Log Battle
    const logId = crypto.randomUUID();
    await db.prepare(`
        INSERT INTO battle_logs (id, attacker_id, defender_id, winner_id, battle_type, location_type, location_id, details_json)
        VALUES (?, ?, ?, ?, 'PVE', 'map_entity', ?, ?)
    `).bind(
        logId, 
        attackerCityId, 
        'NPC', 
        winner === 'attacker' ? attackerCityId : 'NPC',
        targetEntityId,
        JSON.stringify({ 
            attackerLosses: totalRemoved, 
            attackerDead: attackerSplit.dead,
            attackerWounded: attackerSplit.wounded,
            defenderLosses, 
            loot, 
            log 
        })
    ).run();

    return {
        winnerId: winner === 'attacker' ? attackerCityId : 'NPC',
        attackerLosses: totalRemoved,
        defenderLosses,
        attackerWounded: attackerSplit.wounded,
        defenderWounded: {},
        loot,
        log
    };
  }

  private static splitCasualties(
    losses: Record<string, number>,
    isAttacker: boolean,
    ratios: CasualtyRatios,
    capacity: number,
    buffs: { woundedRatio?: number }
  ): { dead: Record<string, number>; wounded: Record<string, number> } {
    const dead: Record<string, number> = {};
    const wounded: Record<string, number> = {};
    
    let remainingCap = capacity;
    const baseRatio = isAttacker ? ratios.attackerWoundedBase : ratios.defenderWoundedBase;
    const bonus = buffs.woundedRatio || 0;
    
    // Effective Ratio = clamp(base + bonus, minDeath, maxWounded)
    // Actually formula: ratio is % that become wounded.
    // Max wounded ratio means max % that can be SAVED. 
    // Min death ratio means min % that MUST die.
    // So Max Wounded = 1 - Min Death.
    
    // Clamp
    let effectiveRatio = baseRatio + bonus;
    effectiveRatio = Math.min(effectiveRatio, ratios.maxWoundedRatio); 
    // Also ensure we respect min death? (User said "MIN_DEATH_RATIO (0.10) => combat is always risky")
    // If MIN_DEATH is 0.1, max wounded is 0.9. The clamp above handles it if maxWoundedRatio is set correctly.
    effectiveRatio = Math.max(effectiveRatio, 0); // No negative

    for (const [troopId, count] of Object.entries(losses)) {
        if (count <= 0) continue;
        
        let numWounded = Math.floor(count * effectiveRatio);
        let numDead = count - numWounded;

        // Check Capacity
        if (remainingCap < numWounded) {
            const overflow = numWounded - remainingCap;
            numWounded = remainingCap;
            numDead += overflow;
            remainingCap = 0;
        } else {
            remainingCap -= numWounded;
        }

        if (numDead > 0) dead[troopId] = numDead;
        if (numWounded > 0) wounded[troopId] = numWounded;
    }

    return { dead, wounded };
  }

  private static async getHospitalCapacity(db: D1Database, cityId: string): Promise<number> {
      // MVP: Base 500 + 100 * City Level (proxy for hospital buildings)
      // Or check for specific building if we had it.
      // Let's check city level
      const city = await db.prepare("SELECT level FROM cities WHERE id = ?").bind(cityId).first<{ level: number }>();
      return 500 + ((city?.level || 1) * 200);
  }

  private static async getCityBuffs(db: D1Database, cityId: string): Promise<{ woundedRatio?: number }> {
      // MVP: Check for active boosts
      // Simplified: Just returning 0 for now unless we query boost_activations
      // Let's try to query generic boost table
      try {
          const userRow = await db.prepare("SELECT user_id FROM cities WHERE id = ?").bind(cityId).first<{ user_id: string }>();
          if (!userRow?.user_id) return {};
          const userId = userRow.user_id;

          const boosts = await db.prepare(`
            SELECT metadata_json FROM boost_activations 
            WHERE user_id = ? AND expires_at > ?
          `).bind(userId, Date.now()).all<{ metadata_json: string }>();
          
          let bonus = 0;
          if (boosts.results) {
              for (const b of boosts.results) {
                  const data = JSON.parse(b.metadata_json);
                  if (data.type === 'wounded_ratio') {
                      bonus += (data.value || 0);
                  }
              }
          }
          return { woundedRatio: bonus };
      } catch (e) {
          return {};
      }
  }

  private static async enqueueWounded(
    db: D1Database, 
    cityId: string, 
    wounded: Record<string, number>, 
    originalTroops: CombatUnit[]
  ) {
      // We need to map troopId (which might be instance ID) back to type ID to stack them in hospital?
      // Or hospital stores by type.
      // The `city_wounded` table uses `troop_type_id`.
      
      const typeMap = new Map<string, string>(); // troopId -> typeId
      originalTroops.forEach(t => typeMap.set(t.troopId, t.typeId));

      for (const [troopId, count] of Object.entries(wounded)) {
          const typeId = typeMap.get(troopId);
          if (typeId && count > 0) {
              await db.prepare(`
                  INSERT INTO city_wounded (id, city_id, troop_type_id, quantity, timestamp)
                  VALUES (?, ?, ?, ?, ?)
                  ON CONFLICT(city_id, troop_type_id) DO UPDATE SET quantity = quantity + ?
              `).bind(
                  crypto.randomUUID(), 
                  cityId, 
                  typeId, 
                  count, 
                  Date.now(),
                  count
              ).run();
          }
      }
  }

  private static async getCityCombatUnits(db: D1Database, cityId: string): Promise<CombatUnit[]> {
    const troops = await db.prepare(`
        SELECT ct.*, tt.code, tt.stats_json, tt.base_power 
        FROM city_troops ct
        JOIN troop_types tt ON ct.troop_type_id = tt.id
        WHERE ct.city_id = ? AND ct.quantity > 0
    `).bind(cityId).all<any>();
    
    return (troops.results || []).map(t => ({
        troopId: t.id,
        typeId: t.troop_type_id,
        code: t.code,
        quantity: t.quantity,
        stats: t.stats_json ? JSON.parse(t.stats_json) : { attack: t.base_power, defense: t.base_power, speed: 1, load: 0, type: 'infantry' }
    }));
  }

  private static simulateCombat(
      attackers: CombatUnit[], 
      defenders: CombatUnit[], 
      log: string[]
  ): { winner: 'attacker' | 'defender' | 'draw'; attackerLosses: Record<string, number>; defenderLosses: Record<string, number> } {
      
      let attPower = 0;
      let defPower = 0;
      
      attackers.forEach(u => attPower += u.quantity * u.stats.attack);
      defenders.forEach(u => defPower += u.quantity * u.stats.attack);

      const attDamage = attPower * (0.9 + Math.random() * 0.2);
      const defDamage = defPower * (0.9 + Math.random() * 0.2) * 1.5; 

      log.push(`Attacker deals ${Math.floor(attDamage)} damage.`);
      log.push(`Defender deals ${Math.floor(defDamage)} damage.`);

      const attackerLosses = this.distributeLosses(attackers, defDamage);
      const defenderLosses = this.distributeLosses(defenders, attDamage);

      const attRemaining = attackers.reduce((sum, u) => sum + (u.quantity - (attackerLosses[u.troopId] || 0)), 0);
      const defRemaining = defenders.reduce((sum, u) => sum + (u.quantity - (defenderLosses[u.troopId] || 0)), 0);

      log.push(`Attacker survivors: ${attRemaining}`);
      log.push(`Defender survivors: ${defRemaining}`);

      let winner: 'attacker' | 'defender' | 'draw' = 'draw';
      if (attRemaining > 0 && defRemaining <= 0) winner = 'attacker';
      else if (defRemaining > 0 && attRemaining <= 0) winner = 'defender';
      else if (attRemaining / (attackers.reduce((s, u) => s + u.quantity, 0) || 1) > defRemaining / (defenders.reduce((s, u) => s + u.quantity, 0) || 1)) {
          winner = 'defender'; // Failed to clear
          log.push('Attack repelled (Defenders held ground).');
      } else {
          winner = 'defender';
      }

      return { winner, attackerLosses, defenderLosses };
  }

  private static distributeLosses(units: CombatUnit[], totalDamage: number): Record<string, number> {
      const losses: Record<string, number> = {};
      let damageRemaining = totalDamage;
      const totalUnits = units.reduce((sum, u) => sum + u.quantity, 0);
      
      for (const unit of units) {
          if (unit.quantity <= 0) continue;
          const share = unit.quantity / totalUnits;
          const damageShare = damageRemaining * share;
          const unitsLost = Math.floor(damageShare / (unit.stats.defense || 1));
          const actualLost = Math.min(unitsLost, unit.quantity);
          losses[unit.troopId] = actualLost;
      }
      return losses;
  }

  private static calculateLoot(available: Record<string, number>, capacity: number): Record<string, number> {
      const loot: Record<string, number> = {};
      let remainingCap = capacity;
      for (const [res, amount] of Object.entries(available)) {
          if (remainingCap <= 0) break;
          const take = Math.min(amount, remainingCap);
          loot[res] = take;
          remainingCap -= take;
      }
      return loot;
  }

  private static async applyLosses(db: D1Database, cityId: string, losses: Record<string, number>) {
      for (const [troopId, count] of Object.entries(losses)) {
          if (count > 0) {
              await db.prepare(`
                  UPDATE city_troops 
                  SET quantity = quantity - ? 
                  WHERE id = ? AND city_id = ?
              `).bind(count, troopId, cityId).run();
          }
      }
  }
}
