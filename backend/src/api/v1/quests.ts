import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';
import { RecurringQuestService } from '../../game/quests';

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

export async function handleQuests(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  if (request.method === 'GET' && url.pathname === '/api/v1/quests') {
    const assignments = await RecurringQuestService.listAssignments(env.DB, userId);
    return jsonResponse(assignments, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/quests/turn-in') {
    const body = await request.json() as { questId?: string; amount?: number };
    if (!body.questId) {
      return jsonResponse({ error: 'questId required' }, 400, corsHeaders);
    }
    const amount = body.amount ?? 0;
    const result = await RecurringQuestService.contribute(env.DB, userId, body.questId, amount);
    if (!result.success) {
      return jsonResponse({ error: result.error || 'Unable to contribute' }, 400, corsHeaders);
    }
    const assignments = await RecurringQuestService.listAssignments(env.DB, userId);
    return jsonResponse({ quest: result.quest, assignments }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
}





