/**
 * KingdomDO - Per-kingdom shard Durable Object
 * Manages tick scheduling, region seeds, and player routing
 */

import { KingdomState } from '../types/kingdoms-persist';

export class KingdomDO {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Initialize state if needed
    let kingdomState = await this.state.storage.get<KingdomState>('state');
    if (!kingdomState) {
      const kingdomId = this.env.KINGDOM.idFromName('kingdom-1').toString();
      kingdomState = {
        id: kingdomId,
        realm_id: 'realm-1',
        region_seeds: {},
        cities: [],
        created_at: Date.now(),
      };
      await this.state.storage.put('state', kingdomState);
    }

    if (path === '/state') {
      return Response.json(kingdomState);
    } else if (path === '/tick') {
      return this.processTick();
    } else if (path === '/regions') {
      return this.getRegions();
    }

    return new Response('Not found', { status: 404 });
  }

  private async processTick(): Promise<Response> {
    const kingdomState = await this.state.storage.get<KingdomState>('state');
    if (!kingdomState) {
      return Response.json({ error: 'State not initialized' }, { status: 500 });
    }

    // Schedule city ticks
    const cities = kingdomState.cities || [];
    const tickPromises = cities.map(cityId => {
      const cityDO = this.env.CITY.get(this.env.CITY.idFromName(cityId));
      return cityDO.fetch(new Request('https://internal/tick', { method: 'POST' }));
    });

    await Promise.allSettled(tickPromises);
    return Response.json({ processed: cities.length });
  }

  private async getRegions(): Promise<Response> {
    const kingdomState = await this.state.storage.get<KingdomState>('state');
    if (!kingdomState) {
      return Response.json({ error: 'State not initialized' }, { status: 500 });
    }
    return Response.json({ regions: kingdomState.region_seeds });
  }
}

