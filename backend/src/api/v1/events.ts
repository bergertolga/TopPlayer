import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      ...headers,
    },
  });
}

export async function handleEvents(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let userId: string;
  try {
    userId = validateUserId(url.searchParams.get('userId') || request.headers.get('X-User-ID'));
  } catch (error: any) {
    return jsonResponse({ error: error.message }, 400, corsHeaders);
  }

  if (request.method === 'GET' && url.pathname === '/api/v1/events') {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const since = parseInt(url.searchParams.get('since') || '0');

    
    const events = await env.DB.prepare(
      `SELECT * FROM analytics_events 
       WHERE user_id = ? AND created_at > ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
      .bind(userId, since, limit)
      .all();

    
    const formattedEvents = events.results.map((event: any) => {
      const eventData = typeof event.event_data === 'string' 
        ? JSON.parse(event.event_data) 
        : event.event_data;

      return {
        id: event.id,
        type: event.event_type,
        data: eventData,
        timestamp: event.created_at,
      };
    });

    return jsonResponse({ events: formattedEvents }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/events/mark-read') {
    const body = await request.json() as { eventIds: string[] };

    
    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

