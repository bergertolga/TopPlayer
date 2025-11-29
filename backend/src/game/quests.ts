import questConfig from '../config/quests.json';

type Cadence = 'daily' | 'weekly';

interface QuestTemplate {
  code: string;
  title: string;
  description: string;
  type: 'resource_delivery';
  resource: string;
  amount: number;
  reward: {
    coins?: number;
    gems?: number;
    resources?: Record<string, number>;
  };
}

interface QuestRow {
  id: string;
  quest_code: string;
  cadence: Cadence;
  cycle_key: string;
  title: string;
  description: string;
  requirement_type: string;
  requirement_resource: string;
  target_amount: number;
  progress: number;
  status: string;
  reward_json: string;
  expires_at: number;
  created_at: number;
  updated_at: number;
}

const QUESTS_PER_CADENCE: Record<Cadence, number> = {
  daily: 3,
  weekly: 1,
};

function getCycleInfo(cadence: Cadence, now = Date.now()): { key: string; expiresAt: number } {
  const date = new Date(now);

  if (cadence === 'daily') {
    date.setUTCHours(0, 0, 0, 0);
    const start = date.getTime();
    const key = `daily-${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    return { key, expiresAt: start + 24 * 60 * 60 * 1000 };
  }

  // Weekly (ISO week)
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + (1 - dayNum));
  const weekStart = temp.getTime();

  const jan4 = new Date(Date.UTC(temp.getUTCFullYear(), 0, 4));
  const weekNumber = Math.round(
    ((weekStart - jan4.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  );
  const key = `weekly-${temp.getUTCFullYear()}-${weekNumber}`;
  return { key, expiresAt: weekStart + 7 * 24 * 60 * 60 * 1000 };
}

function getTemplates(cadence: Cadence): QuestTemplate[] {
  return (questConfig as any)[cadence] || [];
}

async function getCityId(db: D1Database, userId: string): Promise<string | null> {
  const row = await db.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
  return row?.id ?? null;
}

async function adjustResources(
  db: D1Database,
  cityId: string,
  resourceCode: string,
  delta: number
) {
  const resource = await db.prepare('SELECT id FROM resources WHERE code = ?').bind(resourceCode).first<{ id: string }>();
  if (!resource) {
    throw new Error(`Resource ${resourceCode} not found`);
  }

  if (delta >= 0) {
    await db.prepare(
      `INSERT INTO city_resources (city_id, resource_id, amount, protected)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(city_id, resource_id) DO UPDATE SET amount = city_resources.amount + ?`
    )
      .bind(cityId, resource.id, delta, delta)
      .run();
  } else {
    const existing = await db.prepare(
      'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
    )
      .bind(cityId, resource.id)
      .first<{ amount: number }>();

    const currentAmount = Math.max(0, existing?.amount ?? 0);
    const consumption = Math.abs(delta);
    if (currentAmount < consumption) {
      throw new Error('Insufficient resources');
    }

    const newAmount = Math.max(0, currentAmount - consumption);
    await db.prepare(
      'UPDATE city_resources SET amount = ? WHERE city_id = ? AND resource_id = ?'
    )
      .bind(newAmount, cityId, resource.id)
      .run();
  }
}

async function grantQuestReward(
  db: D1Database,
  userId: string,
  reward: { coins?: number; gems?: number; resources?: Record<string, number> }
) {
  const cityId = await getCityId(db, userId);
  if (!cityId) {
    return;
  }

  if (reward.coins && reward.coins > 0) {
    await adjustResources(db, cityId, 'COINS', reward.coins);
  }

  if (reward.gems && reward.gems > 0) {
    await db.prepare(
      'UPDATE user_progress SET premium_currency = premium_currency + ? WHERE user_id = ?'
    )
      .bind(reward.gems, userId)
      .run();
  }

  if (reward.resources) {
    for (const [code, amount] of Object.entries(reward.resources)) {
      if (amount && amount > 0) {
        await adjustResources(db, cityId, code, amount);
      }
    }
  }
}

export class RecurringQuestService {
  static async ensureAssignments(db: D1Database, userId: string): Promise<void> {
    const now = Date.now();
    for (const cadence of ['daily', 'weekly'] as Cadence[]) {
      const { key, expiresAt } = getCycleInfo(cadence, now);
      const existing = await db.prepare(
        `SELECT quest_code FROM recurring_quest_assignments
         WHERE user_id = ? AND cadence = ? AND cycle_key = ?`
      )
        .bind(userId, cadence, key)
        .all<{ quest_code: string }>();

      const assignedCodes = new Set((existing.results || []).map((row: any) => row.quest_code));
      const templates = getTemplates(cadence);
      const needed = Math.max(0, QUESTS_PER_CADENCE[cadence] - assignedCodes.size);
      if (needed <= 0) continue;

      const availableTemplates = templates.filter((tpl) => !assignedCodes.has(tpl.code)).slice(0, needed);
      const nowTs = Date.now();
      for (const template of availableTemplates) {
        await db.prepare(
          `INSERT INTO recurring_quest_assignments (
            id, user_id, quest_code, cadence, cycle_key, title, description,
            requirement_type, requirement_resource, target_amount, progress,
            status, reward_json, expires_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            userId,
            template.code,
            cadence,
            key,
            template.title,
            template.description,
            template.type,
            template.resource,
            template.amount,
            JSON.stringify(template.reward || {}),
            expiresAt,
            nowTs,
            nowTs
          )
          .run();
      }
    }
  }

  static async listAssignments(
    db: D1Database,
    userId: string
  ): Promise<{ daily: any[]; weekly: any[] }> {
    await this.ensureAssignments(db, userId);

    const rows = await db.prepare(
      `SELECT * FROM recurring_quest_assignments WHERE user_id = ?`
    )
      .bind(userId)
      .all<QuestRow>();

    const now = Date.now();
    const sanitized: Record<Cadence, any[]> = { daily: [], weekly: [] };

    for (const row of rows.results as QuestRow[]) {
      let status = row.status;
      if (status === 'active' && row.expires_at <= now) {
        status = 'expired';
        await db.prepare(
          'UPDATE recurring_quest_assignments SET status = ?, updated_at = ? WHERE id = ?'
        )
          .bind(status, now, row.id)
          .run();
      }

      sanitized[row.cadence].push({
        id: row.id,
        code: row.quest_code,
        title: row.title,
        description: row.description,
        cadence: row.cadence,
        status,
        requirement: {
          type: row.requirement_type,
          resource: row.requirement_resource,
          amount: row.target_amount,
        },
        progress: row.progress,
        reward: row.reward_json ? JSON.parse(row.reward_json) : {},
        expiresAt: row.expires_at,
      });
    }

    sanitized.daily.sort((a, b) => a.title.localeCompare(b.title));
    sanitized.weekly.sort((a, b) => a.title.localeCompare(b.title));

    return sanitized;
  }

  static async contribute(
    db: D1Database,
    userId: string,
    questId: string,
    amount: number
  ): Promise<{ success: boolean; quest?: any; error?: string }> {
    if (!amount || amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero.' };
    }

    const quest = await db.prepare(
      'SELECT * FROM recurring_quest_assignments WHERE id = ? AND user_id = ?'
    )
      .bind(questId, userId)
      .first<QuestRow>();

    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    if (quest.status !== 'active') {
      return { success: false, error: 'Quest is not active' };
    }

    const cityId = await getCityId(db, userId);
    if (!cityId) {
      return { success: false, error: 'City not found' };
    }

    if (quest.requirement_type === 'resource_delivery') {
      const resource = await db.prepare(
        'SELECT id FROM resources WHERE code = ?'
      ).bind(quest.requirement_resource).first<{ id: string }>();

      if (!resource) {
        return { success: false, error: 'Resource not found' };
      }

      const stock = await db.prepare(
        'SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?'
      )
        .bind(cityId, resource.id)
        .first<{ amount: number }>();

      const available = Math.max(0, stock?.amount || 0);
      if (available <= 0) {
        return { success: false, error: 'Insufficient resources' };
      }

      const remaining = Math.max(0, quest.target_amount - quest.progress);
      const contribution = Math.min(amount, available, remaining);
      if (contribution <= 0) {
        return { success: false, error: 'Quest already complete' };
      }

      await adjustResources(db, cityId, quest.requirement_resource, -contribution);

      const newProgress = quest.progress + contribution;
      const newStatus = newProgress >= quest.target_amount ? 'completed' : 'active';

      const nowTs = Date.now();
      await db.prepare(
        'UPDATE recurring_quest_assignments SET progress = ?, status = ?, updated_at = ? WHERE id = ?'
      )
        .bind(newProgress, newStatus, nowTs, quest.id)
        .run();

      if (newStatus === 'completed') {
        const reward = quest.reward_json ? JSON.parse(quest.reward_json) : {};
        await grantQuestReward(db, userId, reward);
        await db.prepare(
          'INSERT INTO analytics_events (id, user_id, event_type, event_data, created_at) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(
            crypto.randomUUID(),
            userId,
            'quest_completed',
            JSON.stringify({
              questId: quest.id,
              questCode: quest.quest_code,
              cadence: quest.cadence,
              reward,
            }),
            nowTs
          )
          .run();
      }

      return {
        success: true,
        quest: {
          id: quest.id,
          progress: newProgress,
          status: newStatus,
          delta: contribution,
        },
      };
    }

    return { success: false, error: 'Unsupported quest type' };
  }
}

