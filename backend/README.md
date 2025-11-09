# Idle Adventure Backend

Cloudflare Workers + D1 Database backend for the idle adventure game.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create D1 database:
```bash
wrangler d1 create idle-adventure-db
```

3. Update `wrangler.toml` with the database ID from step 2.

4. Run migrations:
```bash
npm run migrate
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/progress?userId=...` - Get user progress
- `POST /api/progress` - Save user progress
- `GET /api/heroes` - Get all heroes
- `GET /api/heroes/user?userId=...` - Get user's heroes
- `GET /api/adventure/stages` - Get adventure stages
- `POST /api/purchase/verify` - Verify IAP purchase
- `POST /api/analytics` - Log analytics event

