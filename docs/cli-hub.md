# CLI Hub Layout

The CLI now uses a top-level hub so future UI layers (web/mobile) can mirror the same navigation model.

## Panels

1. **City Operations**
   - Collect resources
   - Upgrade buildings
   - Train/view troops
   - Trade routes
   - Building/resource insights
   - Level up city, auto-play helper

2. **Realm & Capital**
   - Realm map (regions, biases, relocation)
   - Capital contracts board
   - Capital affairs (king decrees, favor contributions)
   - World events (global timers, contributions, NPC quests)

3. **Market & Economy**
   - Market Hub (order book, quick buy/sell, surplus actions)
   - Resource & price insights

4. **Social & Chat**
   - Council hub (list/join/leave, treasury, council chat)
   - World chat feed
   - Direct messages (DM threads)
   - Guild hub (join archetypes, view perks)

5. **Account & Rewards**
   - Daily rewards / streak tracker
   - Account summary (user ID, API endpoint)

6. **Shop & Premium**
   - Crown balance + active boosts
   - Daily stipend claim
   - Bundle catalog & purchase flow

The dashboard still shows high-level stats (city summary, resources, Crowns, favor), but day-to-day actions live inside the above panels.

## Config + DB Setup

All economy/society tuning now lives inside D1:

1. Apply the new migrations (config groups, council tech/premium tables):
   ```
   cd backend
   npx wrangler d1 migrations apply
   ```
2. Seed the live config knobs whenever you bootstrap a fresh DB:
   ```
   npx wrangler d1 execute <DB_NAME> --file backend/scripts/seed-config.sql
   ```
3. When running locally with Miniflare, grab the generated sqlite file under `backend/.wrangler/state/v3/d1/**/miniflare-*.sqlite`. Pass that file via `--db` (or set `TOPPLAYER_D1_PATH`) so the CLI sim/profiler can read/write the same config tables.

## Simulation Workflow (Phase 1)

Before changing economy data, run the deterministic sim/profiler loop:

```
D1_DB=/absolute/path/to/backend/.wrangler/state/v3/d1/miniflare-*/something.sqlite

./cli/simulate.sh --players 200 --ticks 10000 --policy diversified --db "$D1_DB" --out sim.json
./cli/profileEconomy.sh --in sim.json --db "$D1_DB" --out metrics.json --quiet
```

- `simulate.ts` now hydrates policy behavior, construction order, building output, and starting city state straight from `sim_config_values`. Each run logs a summary row into `sim_run_metrics` (if the table exists) so we can diff historical tuning later.
- `profileEconomy.ts` still emits the KPIs below, but it now also calculates suggested adjustments (tier pacing deltas, coin drift offsets, militarization & purchase pressure gaps). When the run includes a `runId`, the profiler patches the matching `sim_run_metrics.adjustments_json`.
- If you see warnings like `[cli/db] config group tier_pacing missing`, it means you’re pointing at an unseeded sqlite file. Rerun the seed script above or switch to a DB that already has migrations 0019–0021.

## Metrics & Targets

The profiler writes `metrics.json` with these guardrails:

- **Median ticks to tier:** Hamlet < 800, Town < 2,000, City < 4,000. Anything slower implies construction/resource bottlenecks.
- **Net resource drift:** Wood/Stone should trend slightly positive (+5–10% over baseline); Coins should stay roughly flat; Rations should settle above zero to avoid attrition.
- **Militarization rate:** % of cities allocating >30% of production to troops. Target 25–35% so population cities stay competitive.
- **Happiness variance proxy:** Std dev should stay under 0.2; spikes imply chronic food or ration debt.
- **Stagnation ticks:** Median stalled time (coins, grain, or rations < threshold) should stay under 300 ticks. If it creeps higher, rebalance upkeep or storage.
- **Purchase pressure:** Share of cities taking longer than 2,000 ticks to reach Town. Keep <40% so bundles feel like acceleration rather than necessity.

Run this loop before/after every data tweak; changes that worsen two or more metrics require follow-up adjustments.

