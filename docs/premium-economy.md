# Premium Economy & Social Layer Blueprint

## 1. Currency

- **Crowns**: single premium currency purchased via real-money bundles or earned via limited events.
- **Sources**
  - Paid bundles (micro, starter, vault tiers)
  - Daily royal stipend (e.g., 5 Crowns for logging in + visiting capital)
  - Capital favor quests (weekly)
  - Achievements/milestones (first time clear bonuses)
- **Storage**
  - New `premium_balances` table with `user_id`, `crowns`, `last_claimed_stipend`.

## 2. Spend Sinks

| Sink | Cost | Impact |
|------|------|--------|
| Instant building upgrade | scaling 10–40 Crowns | Completes selected upgrade immediately |
| Troop train speed-up | 5–20 Crowns | Reduces training timer by fixed minutes |
| Contract refresh | 15 Crowns | Rerolls one capital contract instantly |
| Realm relocation discount | 20 Crowns | Waives coin fee + cooldown |
| Capital favor | 30 Crowns | Grants temporary buff (e.g., +10% production for 6h) |
| Shop packs | Varies | Resource bundles, boost packs, daily/weekly chests |

## 3. Bundles

| Bundle | Price (Crowns) | Contents |
|--------|----------------|----------|
| Daily Supply Crate | 50 Crowns (1/day) | +5h production skip, 10 contract refresh tokens |
| Builder Pack | 120 Crowns | 2 instant upgrade tokens, 500 wood, 500 stone |
| War Chest | 200 Crowns | Troop speed-ups, army morale boost, coins |
| Realm Founder | 400 Crowns | Relocation voucher, council crest rename, capital favor |

## 4. World & Social

- **World Chat**: global channel persisted in `world_messages` (message id, user_id, text, created_at).
- **DM Threads**: `dm_conversations` + `dm_messages` tables with simple permissions.
- **Capital**: `/api/v1/world/capital` returns:
  - King’s decree (flavor text)
  - Available favors (quests with resource requests/rewards)
  - Current realm buffs.

## 5. Telemetry / Admin

- Log premium spends, bundle purchases, chat volume, capital favor completions.
- Admin endpoints to grant Crowns, push king announcements, and rotate bundle offerings.

