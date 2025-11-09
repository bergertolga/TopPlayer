/**
 * Kingdoms Persist Tick System
 * Global tick every 10 seconds (MVP)
 */

import { Env } from '../types';

export async function processKingdomsPersistTick(env: Env): Promise<void> {
  try {
    // Increment realm tick
    const realmDO = env.REALM.get(env.REALM.idFromName('realm-1'));
    await realmDO.fetch(new Request('https://internal/tick', { method: 'POST' }));

    // Process kingdom ticks (which will cascade to cities)
    // For MVP, assume single kingdom
    const kingdomDO = env.KINGDOM.get(env.KINGDOM.idFromName('kingdom-1'));
    await kingdomDO.fetch(new Request('https://internal/tick', { method: 'POST' }));

    // Match market orders (batched every 1s, but we'll do it every tick for MVP)
    // This would be handled by RealmDO market matching

  } catch (error) {
    console.error('Error processing Kingdoms Persist tick:', error);
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(processKingdomsPersistTick(env));
  },
};

