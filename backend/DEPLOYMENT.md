# Backend Deployment Guide

## Current Deployment Method

The backend is deployed to **Cloudflare Workers** using Wrangler CLI. Currently, deployment is **manual** via command line.

## Architecture

- **Platform:** Cloudflare Workers (serverless)
- **Database:** Cloudflare D1 (SQLite-compatible)
- **Durable Objects:** Market matching engine (one DO per resource)
- **Cron Jobs:** Server tick processing (every 60 seconds)
- **Build:** TypeScript → JavaScript (via `tsc`)

## Prerequisites

1. **Cloudflare Account** with Workers enabled
2. **Wrangler CLI** installed globally or via npm
3. **Cloudflare API Token** or authenticated via `wrangler login`

### Setup Wrangler

```bash
# Install Wrangler globally
npm install -g wrangler

# Or use npx (no global install needed)
npx wrangler --version

# Login to Cloudflare
wrangler login
```

## Manual Deployment

### Step 1: Build the Project

```bash
cd backend
npm install
npm run build
```

### Step 2: Run Database Migrations

**Important:** Run migrations before deploying to ensure schema is up to date.

```bash
# Apply migrations to production database
wrangler d1 migrations apply idle-adventure-db --remote

# Or for local development
wrangler d1 migrations apply idle-adventure-db --local
```

### Step 3: Seed Database (First Time Only)

```bash
# Seed production database
wrangler d1 execute idle-adventure-db --remote --file=./scripts/seed-kingdom-ledger.sql

# Or seed local database
wrangler d1 execute idle-adventure-db --local --file=./scripts/seed-kingdom-ledger.sql
```

### Step 4: Deploy to Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Or explicitly
wrangler deploy

# Deploy to a specific environment
wrangler deploy --env production
wrangler deploy --env development
```

### Step 5: Verify Deployment

After deployment, Wrangler will output your Worker URL:
```
✨  Deployed to https://idle-adventure-backend.tolga-730.workers.dev
```

Test the deployment:
```bash
curl https://idle-adventure-backend.tolga-730.workers.dev/api/auth/register \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test"}'
```

## Automated Deployment (GitHub Actions)

To set up automatic deployment on git push, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Backend

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy to Cloudflare Workers
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      
      - name: Build
        working-directory: ./backend
        run: npm run build
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: ./backend
          command: deploy
      
      - name: Run migrations
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: ./backend
          command: d1 migrations apply idle-adventure-db --remote
```

### Required GitHub Secrets

Add these secrets to your GitHub repository:

1. **CLOUDFLARE_API_TOKEN**
   - Go to Cloudflare Dashboard → My Profile → API Tokens
   - Create token with:
     - Account: Workers Scripts:Edit
     - Account: D1:Edit
     - Zone: Zone:Read (if using custom domain)

2. **CLOUDFLARE_ACCOUNT_ID**
   - Found in Cloudflare Dashboard → Right sidebar → Account ID

## Environment Configuration

### Production Environment

Configured in `wrangler.toml`:
- **Database:** `idle-adventure-db` (ID: `cc3ae444-ceb1-4e8f-950c-a9548fa93097`)
- **Environment Variable:** `ENVIRONMENT=production`
- **URL:** `https://idle-adventure-backend.tolga-730.workers.dev`

### Development Environment

- **Database:** `idle-adventure-db-dev` (create first, then update ID in `wrangler.toml`)
- **Environment Variable:** `ENVIRONMENT=development`

To create dev database:
```bash
wrangler d1 create idle-adventure-db-dev
# Copy the database_id from output and update wrangler.toml
```

## Database Management

### View Database Contents

```bash
# Query production database
wrangler d1 execute idle-adventure-db --remote --command="SELECT * FROM users LIMIT 10"

# Query local database
wrangler d1 execute idle-adventure-db --local --command="SELECT * FROM users LIMIT 10"
```

### Backup Database

```bash
# Export production database
wrangler d1 export idle-adventure-db --remote --output=backup.sql

# Import to local
wrangler d1 execute idle-adventure-db --local --file=backup.sql
```

### Reset Database (⚠️ Destructive)

```bash
# Drop all tables and re-run migrations
wrangler d1 migrations apply idle-adventure-db --remote --force
wrangler d1 execute idle-adventure-db --remote --file=./scripts/seed-kingdom-ledger.sql
```

## Durable Objects Deployment

Durable Objects are automatically deployed with the Worker. The Market DO is configured in `wrangler.toml`:

```toml
[[durable_objects.bindings]]
name = "MARKET"
class_name = "MarketDO"
script_name = "idle-adventure-backend"
```

After first deployment, create the DO namespace in Cloudflare Dashboard:
1. Go to Workers & Pages → idle-adventure-backend
2. Settings → Durable Objects
3. Create namespace: `MARKET`

## Cron Triggers

Cron jobs are configured in `wrangler.toml`:
```toml
[triggers]
crons = ["* * * * *"]  # Every minute
```

**Note:** Cloudflare cron triggers run at minute intervals. For 60-second intervals, you may need to adjust the cron expression or use a different approach.

After deployment, verify cron triggers in:
- Cloudflare Dashboard → Workers & Pages → idle-adventure-backend → Triggers

## Monitoring & Logs

### View Logs

```bash
# Stream production logs
wrangler tail

# Stream logs with filters
wrangler tail --format=pretty
```

### Cloudflare Dashboard

- **Workers & Pages:** View deployments, logs, metrics
- **D1 Database:** View database size, query performance
- **Analytics:** Request counts, error rates, response times

## Troubleshooting

### Deployment Fails

1. **Check Wrangler authentication:**
   ```bash
   wrangler whoami
   ```

2. **Verify build succeeds:**
   ```bash
   npm run build
   ```

3. **Check TypeScript errors:**
   ```bash
   npx tsc --noEmit
   ```

### Database Connection Issues

1. **Verify database ID in `wrangler.toml`**
2. **Check database exists:**
   ```bash
   wrangler d1 list
   ```

3. **Test database connection:**
   ```bash
   wrangler d1 execute idle-adventure-db --remote --command="SELECT 1"
   ```

### Durable Objects Not Working

1. **Verify DO namespace exists in Cloudflare Dashboard**
2. **Check DO binding in `wrangler.toml`**
3. **Redeploy after creating namespace**

### Cron Jobs Not Running

1. **Verify cron trigger in Cloudflare Dashboard**
2. **Check cron expression syntax**
3. **Wait a few minutes - cron triggers may take time to activate**

## Deployment Checklist

Before deploying:

- [ ] Code compiles without errors (`npm run build`)
- [ ] All tests pass (if applicable)
- [ ] Database migrations are up to date
- [ ] Environment variables are set correctly
- [ ] Durable Objects namespace exists (first deployment)
- [ ] Cron triggers are configured correctly
- [ ] Database is seeded (first deployment)

After deploying:

- [ ] Verify Worker URL is accessible
- [ ] Test API endpoints
- [ ] Check logs for errors
- [ ] Verify database connections
- [ ] Test Durable Objects (market matching)
- [ ] Verify cron jobs are running

## Current Deployment Status

**Production URL:** `https://idle-adventure-backend.tolga-730.workers.dev`

**Last Deployed:** Manual (check git history or Cloudflare Dashboard)

**Database:** `idle-adventure-db` (ID: `cc3ae444-ceb1-4e8f-950c-a9548fa93097`)

**Deployment Method:** Manual (`npm run deploy`)

## Next Steps

1. **Set up GitHub Actions** for automated deployment (see above)
2. **Configure custom domain** (optional)
3. **Set up monitoring alerts** in Cloudflare Dashboard
4. **Create staging environment** for testing before production

