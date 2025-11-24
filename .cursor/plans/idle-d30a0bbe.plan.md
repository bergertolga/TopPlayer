<!-- d30a0bbe-078d-429e-bd11-8329fbcb0a77 e67d2ee7-2238-418b-ae49-00498c063158 -->
# Kingdom Social Loop Plan

## Steps

1. **Guild/Council fusion (`backend/src/api/v1/council.ts`, new guild tables, `cli/index.ts`)**  

- Treat councils as the guild entity: expose list/join/leave, treasury, and members.  
- Add guild-wide chat endpoints (e.g., `/api/v1/council/chat`) backed by a `council_messages` D1 table and surface send/read commands in the CLI.  
- Introduce a city relocation endpoint (`/api/v1/city/move`) so guildmates can cluster in the same region.

2. **Realm map + relocation (`backend/src/config/regions.json`, `backend/src/api/kingdoms-persist/routes.ts`, `cli/index.ts`)**  

- Build a “Realm Map” CLI screen that shows biases, population, guild presence, and capacity for every region.  
- Wire the relocation action into this screen with confirmation, cooldowns, and resource costs.

3. **Capital contracts (`backend/src/api/v1/contracts.ts` new, `backend/migrations/0007_capital_contracts.sql`, `cli/index.ts`)**  

- Seed a `capital_contracts` table with handcrafted quests that scale by chapter/tier.  
- Implement routes to fetch available/active contracts, reserve them, submit deliveries, and payout coins/resources.  
- Add CLI flows to browse, accept, and fulfill these contracts, tracking per-player progression.

4. **Integration polish**  

- Update the dashboard to highlight guild affiliation, home region, and active capital contract.  
- Extend seed scripts and `wrangler d1` migrations to cover messages, relocation history, and contracts.

## Todos

- council-ui: CLI council list/join/chat
- realm-map: Region/realm status screen in CLI
- capital-contracts: Backend routes + CLI flow for handcrafted contracts