
import { Env } from '../../types';

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  });
}

export async function handleLeaderboards(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return jsonResponse({ ok: true });
  }

  // Top Cities (Wealth)
  if (method === 'GET' && path === '/api/v1/leaderboards/cities') {
    const limit = Math.min(100, Number(url.searchParams.get('limit') || 50));
    
    // We need to join with resources to get wealth. 
    // Ideally we'd have a 'score' column on cities updated via cron.
    // For now, let's just use population + level as a proxy for score, 
    // or query coins if performance allows.
    // Let's use population * level for now.
    
    const rows = await env.DB.prepare(
      `SELECT c.id, c.name, c.level, c.population, u.username, c.region_id
       FROM cities c
       JOIN users u ON c.user_id = u.id
       ORDER BY (c.level * 1000 + c.population) DESC
       LIMIT ?`
    ).bind(limit).all();

    return jsonResponse({
      leaderboard: 'cities',
      entries: rows.results.map((r: any, i: number) => ({
        rank: i + 1,
        name: r.name,
        username: r.username,
        level: r.level,
        population: r.population,
        score: r.level * 1000 + r.population
      }))
    });
  }

  // Top Councils (Tech/Prestige)
  if (method === 'GET' && path === '/api/v1/leaderboards/councils') {
    const limit = Math.min(100, Number(url.searchParams.get('limit') || 50));

    const rows = await env.DB.prepare(
      `SELECT c.id, c.name, cp.prestige_score, cp.rank
       FROM councils c
       LEFT JOIN council_prestige cp ON c.id = cp.council_id
       ORDER BY cp.prestige_score DESC
       LIMIT ?`
    ).bind(limit).all();

    return jsonResponse({
      leaderboard: 'councils',
      entries: rows.results.map((r: any, i: number) => ({
        rank: i + 1,
        name: r.name,
        prestige: r.prestige_score || 0
      }))
    });
  }

  // Phase 3: Era Legacy Leaderboard
  if (method === 'GET' && path === '/api/v1/leaderboards/legacy') {
     const limit = Math.min(100, Number(url.searchParams.get('limit') || 50));
     
     // Rank users by total legacy points earned across all seasons
     const rows = await env.DB.prepare(`
        SELECT u.username, SUM(uss.legacy_points_earned) as total_score
        FROM user_season_stats uss
        JOIN users u ON uss.user_id = u.id
        GROUP BY u.id
        ORDER BY total_score DESC
        LIMIT ?
     `).bind(limit).all();
     
     return jsonResponse({
         leaderboard: 'legacy',
         entries: rows.results.map((r: any, i: number) => ({
             rank: i + 1,
             username: r.username,
             score: r.total_score || 0
         }))
     });
  }

  return jsonResponse({ error: 'Not found' }, 404);
}

