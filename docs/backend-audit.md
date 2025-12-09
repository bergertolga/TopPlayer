# Backend/Web Audit

## Routing map (backend/src/index.ts)
- New architecture: `/realm/*`, `/kingdom/*`, `/city/*`, `/ws` → `api/kingdoms-persist/routes.ts`.
- Legacy v1: `/api/v1/city`, `/api/v1/tick`, `/api/v1/market`, `/api/v1/routes`, `/api/v1/council`, `/api/v1/events`, `/api/v1/leaderboards`, `/api/v1/notifications`, `/api/v1/achievements`, `/api/v1/shop|premium`, `/api/v1/quests`, `/api/v1/chat`, `/api/v1/guilds`, `/api/v1/world/events|npc|world`, `/api/v1/army`, `/api/v1/contracts`, `/api/v1/combat`, `/api/v1/client/overview`.
- Auth/progress: `/api/auth/register`, `/api/auth/login`, `/api/progress`.
- Other: `/api/purchase`, `/api/leaderboard`, `/api/social`, `/api/analytics`, `/api/daily-rewards`.
- Disabled legacy prefixes: `/api/purchase`, `/api/leaderboard`, `/api/social`, `/api/analytics`, `/api/heroes`, `/api/adventure`.

## Key feature handlers (sampling)
- City: `api/v1/city.ts` (construct, collect, upgrade, move, milestones).
- Market: `api/v1/market.ts` (order book, place/cancel, my orders; level-gated).
- Council/Guild: `api/v1/council.ts` (create/join, tax, tech, public works, chat, quests).
- Quests: `api/v1/quests.ts` (recurring quests list/turn-in).
- World: `api/world.ts` (capital favor, requests, store offers, rewards).
- World events/NPC: `api/world-events.ts` (events list/rewards, npc quests).
- Combat: `api/v1/combat.ts` (pve map/attack/logs/heal).
- Shop/Premium: `api/v1/shop.ts` (bundles, stipend, balance, purchases; analytics hook).
- Client overview: `api/v1/client-summary.ts` (city resources/buildings/troops/hospital, council summary, events, premium wallet/cosmetics).
- Auth: username-only register/login; no tokens; CORS open.

## Schema highlights (migrations)
- `0001_initial_schema.sql`: users, purchases, analytics_events, early hero/adventure tables (largely unused now), user_progress, daily rewards, achievements.
- `0002_kingdom_ledger_schema.sql`: regions, resources, cities, city_resources/buildings/governors, market_orders/trades/price_ohlcv, routes, councils/members/public_works, pve_nodes + progress.
- Subsequent: milestones (`0003`), treasury (`0004`), storage (`0005`), army (`0006`), messages (`0007`), city move (`0008`), capital contracts/economy (`0009`, `0013`), logistics (`0014`), guild quests (`0015`), shop IAP product id (`0016`), recurring quests (`0017`), rations chain (`0018`), live config (`0019`), council social (`0020`), premium wallet/items (`0021`), events/seasonal (`0022`, `0023`), combat/diplomacy (`0024`), hospital (`0025`), social phase5 (`0026`).

## Web UX snapshot (web/src)
- Routing (App.tsx): protected layout with City, Capital, Market, Map, Council, Events, Combat, Profile; login auto-registers.
- Layout uses inline-styled sidebar/topbar; no design tokens or reusable components; no Shop, Social, Account panels; quests modal button only.
- API client: stores `X-User-ID` in localStorage; points to Workers backend; broad set of endpoints exposed but many screens are placeholders.

## Gaps/Risks
- Auth/session: username-only login, no tokens, no rate limiting; CORS wildcard; POSTs lack CSRF protections.
- Monetization: shop purchases accept product/bundle without strong validation/receipt; premium wallet exposed but stipend anti-abuse minimal; pricing not config-driven.
- Data/API: client overview doesn’t surface shop/offers/favor boosts; some endpoints return plain messages (“coming soon”).
- UX: navigation not aligned to panelized City/Realm/Social/Account/Shop; inline styles; missing states for loading/error/empty; monetization CTAs absent.
- Telemetry: analytics only stores raw events; no consistent client hooks; limited server logging/metrics.

## Recommendations (next steps)
- Add signed session tokens + request rate limits; central error responses.
- Harden shop/purchase validation, receipt hooks, and surface bundles/favor boosts in overview.
- Enrich overview payload with quests/events/council/world/premium for first-paint dashboards.
- Rebuild web layout with panel structure and shared UI primitives; add shop/social/account panels and monetization CTAs.
- Instrument analytics on login, purchases, quest actions; add smoke/load tests for auth/shop/overview.


