
import { Env } from '../../types';
import { jsonResponse } from '../../utils/responses';
import { D1Database } from '@cloudflare/workers-types';

export async function handleClientSummary(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userId = request.headers.get('X-User-ID');

  if (!userId) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  // 1. Fetch City Data (Core)
  const city = await env.DB.prepare(`
    SELECT * FROM cities WHERE user_id = ?
  `).bind(userId).first<any>();

  if (!city) {
    return jsonResponse({ error: 'City not found' }, 404);
  }

  // Parallel Fetching
  const [
    resources, 
    buildings, 
    troops, 
    wounded, 
    councilMember, 
    wallet
  ] = await Promise.all([
    env.DB.prepare('SELECT r.code, cr.amount FROM city_resources cr JOIN resources r ON cr.resource_id = r.id WHERE cr.city_id = ?').bind(city.id).all(),
    env.DB.prepare('SELECT cb.level, b.code FROM city_buildings cb JOIN buildings b ON cb.building_id = b.id WHERE cb.city_id = ?').bind(city.id).all(),
    env.DB.prepare('SELECT tt.code, ct.quantity FROM city_troops ct JOIN troop_types tt ON ct.troop_type_id = tt.id WHERE ct.city_id = ?').bind(city.id).all(),
    env.DB.prepare('SELECT tt.code, cw.quantity FROM city_wounded cw JOIN troop_types tt ON cw.troop_type_id = tt.id WHERE cw.city_id = ?').bind(city.id).all(),
    env.DB.prepare('SELECT * FROM council_members WHERE user_id = ?').bind(userId).first<any>(),
    env.DB.prepare('SELECT * FROM premium_currencies WHERE user_id = ?').bind(userId).first<any>()
  ]);

  // Format Resources
  const resourceMap: Record<string, number> = {};
  (resources.results || []).forEach((r: any) => resourceMap[r.code] = r.amount);

  // Format Buildings
  const buildingsList = (buildings.results || []).map((b: any) => ({ type: b.code, level: b.level }));

  // Format Troops
  const troopsList = (troops.results || []).map((t: any) => ({ type: t.code, count: t.quantity }));
  
  // Format Wounded
  const woundedList = (wounded.results || []).map((w: any) => ({ type: w.code, count: w.quantity }));
  const totalWounded = woundedList.reduce((sum, w) => sum + w.count, 0);
  const hospitalCap = 500 + (city.level * 200); // Sync logic with battle.ts

  // 2. Fetch Council Data (if member)
  let councilData = null;
  if (councilMember) {
    const council = await env.DB.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM council_members WHERE council_id = c.id) as members_count
      FROM councils c WHERE c.id = ?
    `).bind(councilMember.council_id).first<any>();
    
    if (council) {
      councilData = {
        id: council.id,
        name: council.name,
        prestige: council.prestige_score || 0,
        focus: council.primary_focus,
        membersCount: council.members_count,
        badgeId: council.badge_id,
        role: councilMember.role
      };
    }
  }

  // 3. Fetch Events
  // Simplified: Get active events
  const activeEvents = await env.DB.prepare(`
    SELECT ei.id, ed.name, ed.type, ei.end_at, ed.scope
    FROM event_instances ei
    JOIN event_definitions ed ON ei.definition_id = ed.id
    WHERE ei.status = 'active'
  `).all();

  // 4. Premium / Cosmetics
  const ownedCosmetics = await env.DB.prepare(`
    SELECT pi.code, pi.type 
    FROM user_premium_items upi
    JOIN premium_items pi ON upi.premium_item_id = pi.id
    WHERE upi.user_id = ?
  `).bind(userId).all();

  return jsonResponse({
    city: {
      id: city.id,
      name: city.name,
      level: city.level,
      resources: resourceMap,
      buildings: buildingsList,
      troops: troopsList,
      hospital: {
        capacity: hospitalCap,
        occupied: totalWounded,
        woundedByType: woundedList
      }
    },
    council: councilData,
    events: {
      active: activeEvents.results || []
    },
    premium: {
      wallet: {
        gems: wallet?.gems || 0,
        crowns: wallet?.crowns || 0,
        favor: wallet?.favor || 0
      },
      ownedCosmetics: ownedCosmetics.results || []
    }
  });
}

