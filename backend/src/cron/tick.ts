import { Env } from '../types';
import { CityManager } from '../game/city';
import { RouteProcessor } from '../game/routes';
import { PublicWorksProcessor } from '../game/public-works';
import { processPriceHistoryAggregation } from '../game/price-history';
import { CapitalMarketManager } from '../game/capital-market';

export async function processServerTick(env: Env): Promise<void> {
  const now = Date.now();
  
  try {
    await RouteProcessor.processRoutes(env.DB, now);
  } catch (error) {
    console.error('Error processing routes:', error);
  }

  try {
    // Run hourly-ish (approx every 60 ticks if tick is 1m, but here we just run it. 
    // Optimization: CapitalMarketManager checks depth anyway, so running every tick is safe-ish but wasteful.
    // Ideally we'd check if now % 3600000 < tick_interval.
    // For now, let's just run it.
    await CapitalMarketManager.processCapitalInjection(env);
  } catch (error) {
    console.error('Error processing capital market injection:', error);
  }

  try {
    await PublicWorksProcessor.processPublicWorks(env.DB);
  } catch (error) {
    console.error('Error processing public works:', error);
  }

  // Process price history aggregation every 10 ticks (every 10 minutes)
  // Store last aggregation time in a simple way (could use KV or D1)
  try {
    // Run aggregation every tick for now (can be optimized later)
    await processPriceHistoryAggregation(env.DB);
  } catch (error) {
    console.error('Error processing price history aggregation:', error);
  }
  
  const cities = await env.DB.prepare(
    'SELECT id FROM cities ORDER BY last_tick ASC LIMIT 100'
  )
    .all<{ id: string }>();

  for (const city of cities.results) {
    try {
      await CityManager.processCityTick(env.DB, city.id, now);
    } catch (error) {
      console.error(`Error processing tick for city ${city.id}:`, error);
    }
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(processServerTick(env));
  },
};
