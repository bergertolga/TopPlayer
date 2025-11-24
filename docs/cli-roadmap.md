# Idle Kingdom CLI Strategy

## 1. Backend Audit
- `backend/src/index.ts` already multiplexes three surfaces: the legacy `/api/v1/*` ledger routes the CLI is hitting, the newer `/kingdom` “persist” API sitting behind Durable Objects, and older hero/adventure/purchase endpoints. These systems coexist without feature flags, so keep the `/api/v1` handlers plus `./game/*`, `./cron/*`, `./durable-objects/*`, and `./utils/*` as the simulation backbone and mark the unused hero/adventure/payment/social handlers as frozen until the CLI needs them.
- Core simulation modules to retain:
  - `game/city.ts`, `game/building-production.ts`, `game/market.ts`, `game/public-works.ts`, `game/milestones.ts` (city ticks, per-building storage, exchange, council projects, milestone hooks).
  - `durable-objects/city-do.ts`, `kingdom-do.ts`, `realm-do.ts`, `market.ts` (authoritative deterministic loop + matchmaking).
  - `cron/tick.ts`, `cron/kingdoms-persist-tick.ts` (batch ticks and city persistence).
- High-signal tests already exercise these loops:
  - `tests/city-production.test.ts` and `tests/city-long-sim.test.ts` keep per-tick invariants honest across >180 ticks.
  - `tests/market-basic.test.ts` and `tests/council-tax.test.ts` cover price/time priority, council taxation, and prevent negative balances.
  - `tests/kingdom-sim.test.ts` runs the macro loop: production → market trades → council treasury growth.
- Systems to pause (can be moved under `archive/` or left untouched but out of scope): `/api/heroes`, `/api/adventure`, `/api/purchase`, `/api/leaderboard`, `/api/social`, `/api/analytics`, plus `game/adventure.ts`, `game/heroes.ts`, `game/purchases.ts`. None are called by the CLI and they depend on mechanics we are not iterating on right now.

## 2. Data & Infra Snapshot
- Storage: Cloudflare D1 (`backend/migrations/0001_*.sql`, `0002_*.sql`, etc.) defines users, progress, cities, buildings, councils, armies, routes, markets, PvE nodes, and ledger tables. The schema already matches the city/market sim, so keep migrations 0001–0006 and the seeding scripts in `backend/scripts`.
- Durable Objects: `wrangler.toml` binds `MARKET`, `REALM`, `KINGDOM`, `CITY` with migrations `v1` and `v2`. CityDO ticks every 5 minutes (`CITY_TICK_DURATION_MS`) and processes command queues, so it can drive solo-city sims even without cron as long as the CLI (or a small scheduler) hits `/city/tick`.
- Cron: triggers are commented out to stay within the Cloudflare free-tier cap; plan on a lightweight worker (or local script) that posts to `/api/v1/tick` for now. When upgrading the account, re-enable cron for deterministic progression.
- Local dev loop: Wrangler + Miniflare already work (`package.json` scripts). Tests rely on `tests/helpers/runtime.ts`, so keep Vitest for deterministic audits before each CLI release.

## 3. CLI Scope & Pruning Plan
- Short-term CLI surface (`cli/index.ts`):
  - Keep commands that already work: `/api/v1/city` dashboard, `/api/v1/city/collect`, `/api/v1/city/upgrade`, `/api/v1/city/level-up`, `/api/v1/army/troop-types`, `/api/v1/army/train`, `/api/v1/army/troops`, `/api/v1/routes`.
  - Add near-term actions to cover the whole economic loop without leaving the terminal: marketplace browse/order (hook into `/api/v1/market`), council tax view/join (`/api/v1/council`), and simple realm overview (read-only for `kingdoms-persist` routes once stable).
  - Quality-of-life: persistent profile config (store `userId` + `API_URL` in `~/.idle-kingdom.json`), command history, and background auto-collect toggles instead of infinite loop.
- Backend pruning to support the CLI focus:
  - Move stalled modules (adventure, heroes, purchases) into `backend/legacy/` and remove their routes from the dispatcher to reduce attack surface.
  - Collapse duplicate production logic: prefer the Durable Object tick path and kill the ad-hoc recalculations happening inside `api/v1/city.ts` once the CLI consumes the DO state.
  - Replace `CityManager.processCityTick`’s inline resource writes with calls into the DO or a shared service so CLI-triggered ticks and cron ticks share code.

## 4. Platform & Iteration Proposal
- Stack: keep Cloudflare Workers + D1 + Durable Objects as the “server” and a Node/TypeScript CLI (`ts-node` + pkg) as the only client until the sim feels right. This keeps hosting cheap, lets us dogfood immediately, and mirrors the eventual cross-platform client.
- Iteration rhythm:
  1. **Baseline CLI MVP (week 1):** polish existing commands, add profile storage, and wire manual tick commands. Use `vitest` + `npm run dev` to validate backend after each change.
  2. **Economy loop hardening (week 2):** bring market + council commands online, write CLI smoke tests (Jest/Vitest snapshot) that hit a local Miniflare worker.
  3. **Live ops hooks (week 3):** schedule cron or background worker for ticks, expose analytics via CLI (simple logs). Start collecting balance metrics in `analytics_events`.
  4. **Client revival prep (week 4+):** once KPIs (DAU, retention on CLI) stabilize, resurrect a GUI (maybe React Native) that reuses the same REST surface.
- Workflow on the MacBook Air:
  - `wrangler dev --test-scheduled` to emulate ticks, `vitest run` before merges, `npm link` CLI locally for rapid experimentation.
  - Use Git branches per feature; keep docs (like this one) under `docs/` to snapshot thinking per milestone.
- Viability check: the backend already provides deterministic city/market sims with strong test coverage, so building exclusively on top of it through a CLI is practical. The DO architecture is future-friendly for multiplayer kingdoms, and the CLI gives us a cheap way to iterate on balance before touching mobile UX.


