
import { Env } from '../../types';
import { jsonResponse } from '../../utils/responses';
import { BattleEngine } from '../../game/battle';

export async function handleCombat(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/v1/combat', '');
  const method = request.method;

  // Mock user auth (should be middleware)
  const userId = request.headers.get('X-User-ID');
  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // Fetch city for user
  const city = await env.DB.prepare('SELECT id FROM cities WHERE user_id = ?').bind(userId).first<{ id: string }>();
  if (!city) {
    return jsonResponse({ error: 'City not found' }, 404);
  }

  // Routes
  // POST /combat/pve/attack/:entityId
  if (method === 'POST' && path.match(/^\/pve\/attack\/[\w-]+$/)) {
    const entityId = path.split('/').pop()!;
    try {
        const result = await BattleEngine.resolvePvE(env.DB, city.id, entityId);
        
        // Award loot if won
        if (result.winnerId === city.id && Object.keys(result.loot).length > 0) {
           // This requires updating resources directly or creating a transport event
           // For MVP, instant credit
           for (const [resCode, amount] of Object.entries(result.loot)) {
               // Update city resources
               const resource = await env.DB.prepare('SELECT id FROM resources WHERE code = ?').bind(resCode).first<{ id: string }>();
               if (!resource) continue;

               const exists = await env.DB.prepare(`SELECT 1 FROM city_resources WHERE city_id = ? AND resource_id = ?`).bind(city.id, resource.id).first();
               if (exists) {
                   await env.DB.prepare(`UPDATE city_resources SET amount = amount + ? WHERE city_id = ? AND resource_id = ?`).bind(amount, city.id, resource.id).run();
               } else {
                   await env.DB.prepare(`INSERT INTO city_resources (city_id, resource_id, amount, protected) VALUES (?, ?, ?, 0)`).bind(city.id, resource.id, amount).run();
               }
           }
        }

        return jsonResponse({ success: true, result });
    } catch (e: any) {
        return jsonResponse({ error: e.message }, 400);
    }
  }

  // GET /combat/map (List targets)
  if (method === 'GET' && path === '/map') {
      const regionId = url.searchParams.get('region') || 'region-1';
      const entities = await env.DB.prepare(`
          SELECT id, type, level, status, defenders_json, rewards_json 
          FROM map_entities 
          WHERE region_id = ? AND status = 'active'
      `).bind(regionId).all();
      
      return jsonResponse({ targets: entities.results });
  }

  // GET /combat/logs
  if (method === 'GET' && path === '/logs') {
      const logs = await env.DB.prepare(`
          SELECT * FROM battle_logs 
          WHERE attacker_id = ? OR defender_id = ? 
          ORDER BY started_at DESC 
          LIMIT 20
      `).bind(city.id, city.id).all();
      return jsonResponse({ logs: logs.results });
  }

  return new Response('Not found', { status: 404 });
}

