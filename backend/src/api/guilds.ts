import { Env } from '../types';
import { jsonResponse } from '../utils/responses';

export async function handleGuilds(request: Request, env: Env): Promise<Response> {
  // Stub implementation
  return jsonResponse({ message: 'Guilds API placeholder' });
}
