import { Env } from '../../types';
import { validateUserId } from '../../utils/validation';
import { MilestoneSystem } from '../../game/milestones';

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

export async function handleAchievements(
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

  if (request.method === 'GET' && url.pathname === '/api/v1/achievements') {
    const milestones = await MilestoneSystem.getUserMilestones(env.DB, userId);
    return jsonResponse({ milestones }, 200, corsHeaders);
  }

  if (request.method === 'POST' && url.pathname === '/api/v1/achievements/claim') {
    const body = await request.json() as { milestoneId: string };
    const result = await MilestoneSystem.claimMilestoneReward(env.DB, userId, body.milestoneId);
    
    if (!result.success) {
      return jsonResponse({ error: result.error }, 400, corsHeaders);
    }

    return jsonResponse({ success: true }, 200, corsHeaders);
  }

  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

