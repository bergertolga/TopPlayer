# Kingdom Ledger

A multiplayer economy simulation game where players build cities, manage resources, trade on markets, and form councils. Built with Cloudflare Workers (D1) backend and native iOS SwiftUI app.

## Project Structure

```
TopPlayer/
├── backend/           # Cloudflare Workers + D1 backend
│   ├── src/
│   │   ├── index.ts  # Main API handler
│   │   ├── api/v1/   # Kingdom Ledger API endpoints
│   │   ├── game/     # Core game logic modules
│   │   ├── config/   # Game balance JSON files
│   │   └── utils/    # Utility functions
│   ├── migrations/   # Database migrations
│   └── scripts/      # Seed data scripts
├── iOS/              # iOS SwiftUI app
│   └── TopPlayer/    # App source code
└── README.md         # This file
```

## Features

### Core Gameplay
- ✅ City building and management
- ✅ Resource production and consumption (17 resource types)
- ✅ Building upgrades and optimization
- ✅ Market trading with order books
- ✅ Trade routes between regions
- ✅ Council system (guilds/alliances)
- ✅ PvE combat nodes
- ✅ Governor assignment system
- ✅ Public works projects
- ✅ Server tick system (60-second cycles)

### Monetization
- ✅ In-app purchases (StoreKit 2)
- ✅ Server-side purchase verification (Apple App Store Server API)
- ✅ Currency packs and boosters

### Social & Analytics
- ✅ User authentication
- ✅ Analytics tracking
- ✅ Council treasury and tax collection
- 🔄 Multi-language support - Framework ready
- 🔄 Admin dashboard - Framework ready

## Setup

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create D1 database:
```bash
wrangler d1 create idle-adventure-db
```

3. Update `wrangler.toml` with your database ID

4. Run migrations:
```bash
npm run migrate
```

5. Seed initial data:
```bash
wrangler d1 execute idle-adventure-db --file=./scripts/seed-kingdom-ledger.sql
```

6. Run additional migrations (if needed):
```bash
wrangler d1 execute idle-adventure-db --file=./migrations/0004_council_treasury.sql
```

7. Start development server:
```bash
npm run dev
```

### iOS Setup

1. Open `iOS/TopPlayer.xcodeproj` in Xcode
2. Update `iOS/TopPlayer/Config/AppConfig.swift` with your Cloudflare Worker URL
3. Configure StoreKit product IDs in `PurchaseService.swift`
4. Build and run

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (creates starter city)
- `POST /api/auth/login` - Login user

### City Management (`/api/v1/city`)
- `GET /api/v1/city?userId=...` - Get city state (resources, buildings, governors)
- `POST /api/v1/city/rename?userId=...` - Rename city
- `POST /api/v1/city/upgrade?userId=...` - Upgrade building
- `POST /api/v1/city/governor/assign?userId=...` - Assign governor
- `POST /api/v1/city/governor/unassign?userId=...` - Unassign governor
- `GET /api/v1/city/governors/available?userId=...` - Get available governors
- `POST /api/v1/tick/apply?userId=...` - Manual tick (for testing)

### Market (`/api/v1/market`)
- `GET /api/v1/market/book?resource=...` - Get order book
- `GET /api/v1/market/history?resource=...` - Get price history (OHLCV)
- `POST /api/v1/market/order?userId=...` - Place buy/sell order
- `POST /api/v1/market/cancel?userId=...` - Cancel order

### Routes (`/api/v1/routes`)
- `GET /api/v1/routes?userId=...` - Get user's routes
- `POST /api/v1/routes/create?userId=...` - Create route
- `POST /api/v1/routes/cancel?userId=...` - Cancel route

### Council (`/api/v1/council`)
- `GET /api/v1/council?userId=...` - Get council state
- `POST /api/v1/council/create?userId=...` - Create council
- `POST /api/v1/council/join?userId=...` - Join council
- `POST /api/v1/council/tax?userId=...` - Set tax rate (steward only)
- `POST /api/v1/council/public-works/create?userId=...` - Create public works project
- `POST /api/v1/council/public-works/contribute?userId=...` - Contribute to public works
- `POST /api/v1/council/treasury/withdraw?userId=...` - Withdraw from treasury (steward only)

### PvE (`/api/v1/pve`)
- `GET /api/v1/pve/nodes?regionId=...` - Get available PvE nodes
- `POST /api/v1/pve/attack?userId=...` - Attack PvE node

### Purchase
- `POST /api/purchase/verify?userId=...` - Verify IAP purchase

### Analytics
- `POST /api/analytics` - Log analytics event

## Database Schema

See `backend/migrations/` for complete database schema.

Key tables:
- `users` - User accounts
- `cities` - Player cities
- `city_resources` - City inventory
- `buildings` - Building definitions
- `city_buildings` - Player-owned buildings
- `resources` - Resource definitions (17 types)
- `regions` - Game world regions
- `governors` - Governor definitions
- `city_governors` - Governor assignments
- `market_orders` - Buy/sell orders
- `trades` - Trade history
- `price_ohlcv` - Price history (OHLCV format)
- `routes` - Trade routes
- `councils` - Guilds/alliances
- `council_members` - Council membership
- `public_works` - Council projects
- `pve_nodes` - PvE combat nodes
- `user_pve_progress` - PvE completion tracking

## Game Systems

### City Management
- **Production**: Buildings produce resources based on level, region bias, governor bonuses, and happiness
- **Consumption**: Population consumes food and fabric
- **Happiness**: Affects production multiplier (0.8 + happiness * 0.4)
- **Warehouse**: Storage capacity increases with warehouse building level
- **Upkeep**: Buildings require coins and resources to operate

### Market Trading
- **Order Book**: Price-time priority matching via Durable Objects
- **Price Bands**: Orders must be within ±40% of 24h VWAP
- **Fees**: Transaction fees (0.8%-2%) and council taxes (0-5%)
- **Tax Collection**: Council taxes collected from seller's region

### Routes
- **Logistics**: Transport resources between regions
- **Risk Events**: Bandit attacks, weather delays, minor damage
- **Escorts**: Reduce risk of events
- **Warehouse Capacity**: Destination must have capacity

### Council System
- **Taxes**: Collected from market trades in council's region
- **Treasury**: Stores collected taxes
- **Public Works**: Collaborative projects with region bonuses
- **Roles**: Steward, officer, member

### Governors
- **Assignment**: Assign to city or specific building
- **Bonuses**: Production, processing, happiness, market fees
- **Rarity**: Common, rare, epic, legendary

### PvE Combat
- **Nodes**: Bandit camps and other challenges
- **Power Calculation**: Based on city level, population, buildings
- **Rewards**: Resources with chance-based drops
- **Respawn**: Nodes respawn after 1 hour

## Development Notes

### Server Tick System
- Runs every 60 seconds via Cloudflare Cron
- Processes: routes, PvE respawns, public works, city ticks
- Batch processing: 100 cities per tick

### Price History
- OHLCV aggregation runs every tick
- Buckets: 15m, 1h, 24h
- Used for price band validation

### Apple Receipt Validation
- Supports StoreKit 2 (transaction-based) and StoreKit 1 (receipt-based)
- Requires Apple App Store Server API credentials for production
- Development mode allows basic validation

## Environment Variables

Backend:
- `ENVIRONMENT` - `development` or `production`
- `APPLE_APP_STORE_API_KEY` - App Store Connect API key (for production)
- `APPLE_APP_STORE_KEY_ID` - App Store Connect key ID
- `APPLE_APP_STORE_ISSUER_ID` - App Store Connect issuer ID
- `APPLE_BUNDLE_ID` - App bundle identifier
- `APPLE_SHARED_SECRET` - App Store shared secret (for StoreKit 1)

iOS:
- Update `iOS/TopPlayer/Config/AppConfig.swift` with your Cloudflare Worker URL

## Deployment

### Backend
```bash
cd backend
npm run deploy
```

### Database Migrations
```bash
wrangler d1 migrations apply idle-adventure-db
wrangler d1 execute idle-adventure-db --file=./scripts/seed-kingdom-ledger.sql
wrangler d1 execute idle-adventure-db --file=./migrations/0004_council_treasury.sql
```

## License

Proprietary - All rights reserved
