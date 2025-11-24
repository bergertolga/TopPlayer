import { Env } from '../types';

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

export async function handleRealm(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/realm/regions') {
    const regions = await env.DB.prepare(
      `SELECT r.*, 
              (SELECT COUNT(*) FROM cities c WHERE c.region_id = r.id) as city_count,
              (SELECT COUNT(*) FROM councils co WHERE co.region_id = r.id) as council_count
       FROM regions r
       ORDER BY r.tier DESC, r.name ASC`
    ).all();

    const regionStats = [];
    for (const region of regions.results as any[]) {
      const topGuild = await env.DB.prepare(
        `SELECT c.name, COUNT(cm.user_id) as members
         FROM councils c
         JOIN council_members cm ON cm.council_id = c.id
         WHERE c.region_id = ?
         GROUP BY c.id
         ORDER BY members DESC
         LIMIT 1`
      ).bind(region.id).first<{ name: string; members: number }>();

      regionStats.push({
        id: region.id,
        name: region.name,
        tier: region.tier,
        biases: {
          wood: region.wood_bias,
          ore: region.ore_bias,
          food: region.food_bias,
          stone: region.stone_bias,
          fiber: region.fiber_bias,
          clay: region.clay_bias,
        },
        eventTag: region.event_tag,
        maxCities: region.max_cities,
        cityCount: region.city_count,
        councilCount: region.council_count,
        dominantCouncil: topGuild ? { name: topGuild.name, members: topGuild.members } : null,
      });
    }

    return jsonResponse({ regions: regionStats }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}

