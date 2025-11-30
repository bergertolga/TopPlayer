
import { Env } from '../../types';
import { jsonResponse } from '../../utils/responses';
import { TechManager } from '../../game/tech';

export async function handleCouncilTech(request: Request, env: Env, userId: string, councilId: string): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname; // Expected format: /api/v1/council/tech...

  if (request.method === 'GET' && path.endsWith('/tech/tree')) {
    const tree = await TechManager.getTechTree(env.DB);
    const progress = await TechManager.getCouncilProgress(env.DB, councilId);
    
    // Merge info
    const enriched = tree.map(t => {
      const p = progress.find(pr => pr.tech_id === t.id);
      return {
        ...t,
        status: p ? p.status : (t.tier === 1 ? 'unlocked' : 'locked'), // Simplified unlock logic
        progress: p ? p.progress : 0,
        current_contributions: p ? JSON.parse(p.contributed_resources_json) : {}
      };
    });
    
    return jsonResponse({ tech_tree: enriched });
  }

  if (request.method === 'POST' && path.match(/\/tech\/contribute$/)) {
    const body = await request.json() as { techCode: string; resources: Record<string, number> };
    if (!body.techCode || !body.resources) {
      return jsonResponse({ error: 'Missing parameters' }, 400);
    }

    // Validate user has resources (City logic needed here, bypassing for MVP or assume client checks + optimistic/server verification later)
    // Actually, we must verify.
    const city = await env.DB.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
    if (!city) return jsonResponse({ error: 'No city found' }, 400);

    // Check resources
    for (const [res, amount] of Object.entries(body.resources)) {
        const resource = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind(res).first<{ id: string }>();
        if (!resource) return jsonResponse({ error: `Resource ${res} not found` }, 400);

        const has = await env.DB.prepare('SELECT amount FROM city_resources WHERE city_id = ? AND resource_id = ?').bind(city.id, resource.id).first<{ amount: number }>();
        if (!has || has.amount < amount) {
            return jsonResponse({ error: `Insufficient ${res}` }, 400);
        }
    }

    // Deduct resources
    for (const [res, amount] of Object.entries(body.resources)) {
        const resource = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind(res).first<{ id: string }>();
        if (resource) {
            await env.DB.prepare('UPDATE city_resources SET amount = amount - ? WHERE city_id = ? AND resource_id = ?').bind(amount, city.id, resource.id).run();
        }
    }

    const result = await TechManager.contributeToTech(env.DB, councilId, userId, body.techCode, body.resources);
    return jsonResponse(result);
  }

  return jsonResponse({ error: 'Not found' }, 404);
}
