<!-- 61dbf9c8-f8be-4b9d-a162-5d5dc1cf88df c281adaa-3684-48b9-b7f2-70d8e43d4cfa -->
# Complete Game System Architecture

## Current State Analysis

- Only 1 starter hero given on registration
- No hero recruitment/acquisition system
- No PvP, Guilds, or social features
- Equipment system exists in schema but not implemented
- Hero shards mentioned but not used
- Missing core gameplay loops

## Core Game Design Philosophy

**Original Hero Recruitment System**: Instead of TopHeroes' tokens, use a "Discovery" system where heroes are found through exploration, fusion, and strategic gameplay - not just random pulls.

## Phase 1: Hero Recruitment & Collection System

### 1.1 Hero Shard System

- Heroes acquired through shards (not direct pulls)
- Shards drop from adventures, daily rewards, achievements
- Shard fusion: combine lower-tier shards to create higher-tier heroes
- Shard exchange: trade excess shards for desired heroes
- Database: Add `hero_shards` table tracking user shard counts

### 1.2 Discovery System (Original Mechanic)

- "Exploration" mode: Send heroes on expeditions to discover new heroes
- Discovery tokens: Earned through gameplay, used to unlock hero discoveries
- Hero fusion: Combine 3 heroes of same rarity to create 1 hero of next tier
- Elemental combinations: Fire + Water = Steam Hero (unique combinations)
- Database: Add `discoveries` table, `hero_fusion_recipes` table

### 1.3 Recruitment Shop

- Rotating hero shop (changes daily)
- Purchase heroes directly with gems/coins
- Purchase shards for specific heroes
- Limited-time hero events

## Phase 2: Equipment & Enhancement System

### 2.1 Equipment Acquisition

- Drop from adventures (rarity based on stage)
- Crafting system: Combine materials to create equipment
- Equipment gacha: Spend gems for random equipment
- Guild shop: Purchase equipment with guild currency

### 2.2 Equipment Enhancement

- Upgrade equipment with materials
- Enchant equipment with runes (new resource)
- Set bonuses: Equip matching sets for bonuses
- Equipment fusion: Combine 3 items to create higher tier

### 2.3 Rune System

- Runes drop from adventures and PvP
- Socket runes into equipment
- Rune sets provide bonuses
- Rune enhancement system

## Phase 3: PvP System

### 3.1 Arena Mode

- Asynchronous PvP: Attack other players' defenses
- Defense teams: Set up heroes to defend
- Ranking system: Bronze, Silver, Gold, Platinum, Diamond tiers
- Daily rewards based on rank
- Attack/defense logs with replay system

### 3.2 Tournament System

- Weekly tournaments with brackets
- Rewards: Exclusive heroes, equipment, currency
- Leaderboards: Global and server-specific
- Database: Add `pvp_matches`, `tournaments`, `leaderboards` tables

### 3.3 PvP Rewards

- Arena coins: Earned from wins, spent in arena shop
- Season rewards: End-of-season rewards based on rank
- Achievement rewards for PvP milestones

## Phase 4: Guild System

### 4.1 Guild Creation & Management

- Create/join guilds (max 50 members)
- Guild levels: Level up through guild activities
- Guild roles: Leader, Officer, Member
- Guild chat: Real-time messaging
- Guild settings: Privacy, requirements, description

### 4.2 Guild Activities

- Guild raids: Boss battles requiring coordination
- Guild wars: Guild vs Guild battles
- Guild quests: Daily/weekly objectives
- Guild donations: Contribute resources for guild benefits
- Database: Add `guilds`, `guild_members`, `guild_raids`, `guild_wars` tables

### 4.3 Guild Rewards

- Guild shop: Exclusive items
- Guild currency: Earned from activities
- Guild buffs: Passive bonuses for members
- Guild achievements: Unlock permanent bonuses

## Phase 5: Advanced Progression Systems

### 5.1 Prestige System

- Reset progress for permanent multipliers
- Prestige currency: Used for permanent upgrades
- Prestige shop: Buy permanent bonuses
- Prestige levels: Multiple prestige tiers

### 5.2 Research/Tech Tree

- Research points: Earned from gameplay
- Unlock permanent upgrades
- Multiple research branches
- Research boosts: Temporary multipliers

### 5.3 Mastery System

- Hero mastery: Unlock as heroes level up
- Mastery bonuses: Passive stat increases
- Mastery skills: Active abilities
- Mastery trees: Multiple paths per hero

## Phase 6: Content & Events

### 6.1 Adventure Modes

- Story mode: Main campaign (current)
- Challenge mode: Harder stages with better rewards
- Endless mode: Infinite stages, increasing difficulty
- Boss rush: Fight multiple bosses in sequence

### 6.2 Event System

- Limited-time events: Special stages, rewards
- Seasonal events: Holiday-themed content
- Login events: Daily login rewards
- Achievement events: Complete objectives for rewards

### 6.3 Daily/Weekly Content

- Daily quests: Complete objectives for rewards
- Weekly challenges: Harder objectives
- Daily boss: Special boss with unique rewards
- Weekly raid: Guild coordination required

## Phase 7: Monetization Mechanics

### 7.1 Premium Currency Sources

- IAP purchases (existing)
- Daily login rewards
- Achievement rewards
- PvP season rewards
- Guild war rewards

### 7.2 Monetization Products

- Hero packs: Guaranteed hero of specific rarity
- Shard packs: Large quantities of hero shards
- Equipment packs: Guaranteed equipment sets
- Resource packs: Coins, gems, energy bundles
- Battle passes: Premium track with exclusive rewards
- VIP system: Subscription with daily benefits

### 7.3 Time-Saver Products

- Energy refills
- Skip tickets: Skip adventure stages
- Auto-battle time: Extended auto-battle duration
- Speed boosts: Faster progression

## Phase 8: Social Features

### 8.1 Friend System

- Add friends by username/ID
- Send/receive energy daily
- View friend teams
- Friend leaderboards
- Database: Add `friends`, `friend_requests` tables

### 8.2 Chat System

- Global chat: Server-wide messaging
- Guild chat: Guild-only messaging
- Private messages: Direct messaging
- Chat moderation: Filtering, reporting
- Database: Add `chat_messages` table

### 8.3 Leaderboards

- Power leaderboard: Highest team power
- Adventure leaderboard: Furthest stage
- PvP leaderboard: Arena rankings
- Guild leaderboard: Guild power/activity
- Achievement leaderboard: Most achievements

## Phase 9: Quality of Life & Polish

### 9.1 UI/UX Improvements

- Hero collection screen with filters
- Equipment management interface
- Guild management UI
- PvP battle interface
- Event calendar view

### 9.2 Automation Features

- Auto-battle: Set heroes to auto-farm stages
- Auto-upgrade: Auto-spend resources on upgrades
- Auto-collect: Auto-claim idle rewards
- Battle speed: 1x, 2x, 4x speed options

### 9.3 Notifications

- Push notifications for energy refill
- Guild activity notifications
- PvP defense notifications
- Event reminders

## Implementation Priority

**Critical Path (MVP):**

1. Hero shard system + recruitment shop
2. Equipment system (drops + enhancement)
3. Basic PvP (Arena mode)
4. Basic Guild system (creation + chat)

**Important (Post-MVP):**

5. Discovery/fusion system
6. Guild raids/wars
7. Tournament system
8. Prestige system

**Nice to Have:**

9. Advanced mastery system
10. Complex event system
11. Battle pass
12. VIP system

## Database Schema Additions Needed

- `hero_shards` - User shard inventory
- `discoveries` - Hero discovery progress
- `hero_fusion_recipes` - Fusion combinations
- `equipment_drops` - Equipment drop tables
- `runes` - Rune definitions
- `user_runes` - User rune inventory
- `pvp_matches` - PvP match history
- `tournaments` - Tournament data
- `guilds` - Guild information
- `guild_members` - Guild membership
- `guild_raids` - Guild raid progress
- `guild_wars` - Guild war matches
- `friends` - Friend relationships
- `chat_messages` - Chat history
- `events` - Event definitions
- `user_events` - User event progress

## Technical Considerations

- All systems must work asset-light (emojis, text, colors)
- Idle mechanics: Everything should generate resources offline
- Server-side validation for all competitive features (PvP, Guilds)
- Rate limiting for all endpoints
- Caching for leaderboards and rankings
- Real-time updates for Guild chat (WebSockets or polling)

### To-dos

- [ ] Implement Apple receipt validation in backend using Apple verification API
- [ ] Implement purchase rewards system - grant items/currency based on productId
- [ ] Complete experience system - apply XP to heroes, handle level ups, grant rewards
- [ ] Create daily rewards UI view and integrate with backend API
- [ ] Create comprehensive backend tests for API endpoints and game logic
- [ ] Create unit tests for iOS ViewModels, Services, and Models
- [ ] Create UI tests for critical user flows (register, login, upgrade, battle)
- [ ] Improve text-based UI - typography, colors, spacing, card designs
- [ ] Add detailed hero backstories, adventure narratives, and item descriptions
- [ ] Add SwiftUI animations, better loading states, and progress indicators
- [ ] Improve error handling throughout app with user-friendly messages
- [ ] Create first-time user onboarding experience
- [ ] Enhance analytics tracking and add error logging
- [ ] Add input validation, rate limiting, and security improvements
- [ ] Prepare App Store listing, privacy policy, ToS, and StoreKit configuration