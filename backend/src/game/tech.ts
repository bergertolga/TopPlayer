
import { D1Database } from '@cloudflare/workers-types';

export interface TechDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  tier: number;
  cost_json: string;
  prerequisites_json: string;
  buff_json: string;
}

export interface TechProgress {
  id: string;
  council_id: string;
  tech_id: string;
  progress: number;
  status: 'locked' | 'active' | 'completed';
  contributed_resources_json: string;
}

export class TechManager {
  static async getTechTree(db: D1Database): Promise<TechDefinition[]> {
    const rows = await db.prepare(`SELECT * FROM council_tech_tree ORDER BY tier ASC`).all<TechDefinition>();
    return rows.results || [];
  }

  static async getCouncilProgress(db: D1Database, councilId: string): Promise<TechProgress[]> {
    const rows = await db.prepare(`
      SELECT * FROM council_tech_progress WHERE council_id = ?
    `).bind(councilId).all<TechProgress>();
    return rows.results || [];
  }

  static async getCouncilBuffs(db: D1Database, councilId: string): Promise<Record<string, number>> {
    // 1. Get completed techs
    const completed = await db.prepare(`
      SELECT t.buff_json 
      FROM council_tech_progress p
      JOIN council_tech_tree t ON p.tech_id = t.id
      WHERE p.council_id = ? AND p.status = 'completed'
    `).bind(councilId).all<{ buff_json: string }>();

    const buffs: Record<string, number> = {};

    if (!completed.results) return buffs;

    for (const row of completed.results) {
      try {
        const effects = JSON.parse(row.buff_json);
        // Effects might be nested: { production: { COINS: 0.05 }, combat: { power: 0.1 } }
        // Flatten or handle structure. For now, we'll just merge specific known keys or flatten
        this.mergeBuffs(buffs, effects);
      } catch (e) {
        console.error('Error parsing tech buffs', e);
      }
    }
    return buffs;
  }

  private static mergeBuffs(target: any, source: any) {
    for (const key in source) {
      if (typeof source[key] === 'object' && source[key] !== null) {
        if (!target[key]) target[key] = {};
        this.mergeBuffs(target[key], source[key]);
      } else if (typeof source[key] === 'number') {
        target[key] = (target[key] || 0) + source[key];
      } else {
        target[key] = source[key];
      }
    }
  }

  static async contributeToTech(
    db: D1Database, 
    councilId: string, 
    userId: string, 
    techCode: string, 
    contributions: Record<string, number>
  ): Promise<{ success: boolean; message: string; techCompleted?: boolean }> {
    
    // 1. Find Tech ID
    const tech = await db.prepare(`SELECT * FROM council_tech_tree WHERE code = ?`).bind(techCode).first<TechDefinition>();
    if (!tech) return { success: false, message: 'Tech not found' };

    // 2. Check Prerequisites
    // (Simplification: Assume UI filters, or check strictly)
    
    // 3. Get or Create Progress
    let progress = await db.prepare(`
      SELECT * FROM council_tech_progress WHERE council_id = ? AND tech_id = ?
    `).bind(councilId, tech.id).first<TechProgress>();

    if (!progress) {
      const id = crypto.randomUUID();
      await db.prepare(`
        INSERT INTO council_tech_progress (id, council_id, tech_id, status, progress, contributed_resources_json)
        VALUES (?, ?, ?, 'active', 0, '{}')
      `).bind(id, councilId, tech.id).run();
      progress = { id, council_id: councilId, tech_id: tech.id, status: 'active', progress: 0, contributed_resources_json: '{}' } as TechProgress;
    }

    if (progress.status === 'completed') {
      return { success: false, message: 'Tech already completed' };
    }

    // 4. Validate Costs
    const costs = JSON.parse(tech.cost_json);
    const currentContribs = JSON.parse(progress.contributed_resources_json || '{}');
    
    let totalProgressPercent = 0;
    let totalCostSum = 0;
    let totalContribSum = 0;

    // Determine value of contribution vs total cost
    // We treat progress as 0.0 to 1.0 based on weighted resource fulfillment?
    // Or simple: sum of all resource amounts vs sum of all costs? 
    // Simple sum is risky (1 coin vs 1 stone).
    // Better: Track per-resource fulfillment.

    let isComplete = true;
    for (const [res, amount] of Object.entries(costs)) {
      const required = amount as number;
      const current = (currentContribs[res] || 0);
      const added = (contributions[res] || 0);
      
      if (current + added < required) {
        isComplete = false;
      }
      currentContribs[res] = current + added;
    }

    // 5. Update Progress Record
    const newProgressVal = isComplete ? 1.0 : 0.5; // Placeholder for actual % calc

    await db.prepare(`
      UPDATE council_tech_progress 
      SET contributed_resources_json = ?, status = ?, progress = ?
      WHERE id = ?
    `).bind(JSON.stringify(currentContribs), isComplete ? 'completed' : 'active', newProgressVal, progress.id).run();

    // 6. Log Member Contribution
    // (Optional: optimization to not log every tiny bit, but good for ledger)
    for (const [res, amount] of Object.entries(contributions)) {
       if (amount > 0) {
         await db.prepare(`
            INSERT INTO council_member_contributions (id, council_id, user_id, contribution_type, target_id, resource_code, amount)
            VALUES (?, ?, ?, 'tech', ?, ?, ?)
         `).bind(crypto.randomUUID(), councilId, userId, progress.id, res, amount).run();
       }
    }

    return { 
      success: true, 
      message: isComplete ? `Tech ${tech.name} researched!` : 'Contribution recorded',
      techCompleted: isComplete
    };
  }
}

