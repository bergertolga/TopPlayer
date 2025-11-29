
import { Env } from '../../types';
import { jsonResponse } from '../../utils/responses';

export async function handleNotifications(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  
  // GET /api/v1/notifications
  if (request.method === 'GET') {
      // In a real app, this would return a list of recent alerts for the user
      // For this MVP, we'll return dynamic system-wide alerts (Crises, Seasons)
      
      const alerts: any[] = [];
      
      const { SeasonManager } = await import('../../game/seasons');
      const activeSeason = await SeasonManager.getActiveSeason(env.DB);
      
      if (activeSeason) {
          alerts.push({
              id: 'season-alert',
              type: 'season',
              title: `Season ${activeSeason.instance.season_number}: ${activeSeason.rules.productionMultiplier ? 'Active' : 'Unknown'}`,
              message: `Current era effects: Production x${activeSeason.rules.productionMultiplier || 1.0}`,
              severity: 'info'
          });
          
          if (activeSeason.rules.crisisThresholds) {
              // Quick check if we are in crisis mode (mocked global state check)
              // Ideally this reads from a 'world_state' table
              alerts.push({
                  id: 'crisis-warning',
                  type: 'warning',
                  title: 'Resource Scarcity',
                  message: 'Food reserves are dwindling globally. Hoarding penalties active.',
                  severity: 'warning'
              });
          }
      }
      
      return jsonResponse({ alerts });
  }
  
  return new Response('Method not allowed', { status: 405 });
}

