#!/usr/bin/env node

import readline from 'readline';

// Configuration
let API_URL = process.env.API_URL || 'https://idle-adventure-backend.tolga-730.workers.dev';

// Types
interface Resource {
  code: string;
  name: string;
  amount: number;
}

interface Building {
  code: string;
  name: string;
  level: number;
  upgradeCost: number;
  canUpgrade: boolean;
  is_active: number;
  productionRate?: Record<string, number>;
  consumptionRate?: Record<string, number>;
  outputRate?: Record<string, number>;
  storage_capacity?: number;
  storage_json?: Record<string, number>;

}

interface City {
  id: string;
  name: string;
  level: number;
  population: number;
  region_name: string;
}

interface GameState {
  city: City | null;
  resources: Resource[];
  buildings: Building[];
}

interface PremiumSnapshot {
  crowns: number;
  lastStipendAt?: number;
  boosts?: Array<{ boost_code?: string; expires_at?: number; metadata_json?: string }>;
}

interface CapitalSnapshot {
  favorPoints: number;
  king: {
    name: string;
    decree: string;
    message: string;
    issuedAt: number;
  };
  actions: Array<{ code: string; reward: number; [key: string]: any }>;
}

const RESOURCE_METADATA: Record<string, { name: string; type: string; description: string }> = {
  WOOD: { name: 'Wood', type: 'raw', description: 'Basic building material' },
  STONE: { name: 'Stone', type: 'raw', description: 'Sturdy construction material' },
  ORE: { name: 'Iron Ore', type: 'raw', description: 'Raw metal for smelting' },
  FOOD: { name: 'Food', type: 'raw', description: 'Sustains your population' },
  FIBER: { name: 'Fiber', type: 'raw', description: 'Textile material' },
  CLAY: { name: 'Clay', type: 'raw', description: 'Pottery and brick material' },
  PLANKS: { name: 'Planks', type: 'refined', description: 'Processed wood' },
  BRICKS: { name: 'Bricks', type: 'refined', description: 'Fired clay bricks' },
  INGOTS: { name: 'Iron Ingots', type: 'refined', description: 'Smelted metal' },
  FABRIC: { name: 'Fabric', type: 'refined', description: 'Woven textiles' },
  TOOLS: { name: 'Tools', type: 'refined', description: 'Crafted tools for efficiency' },
  COAL: { name: 'Coal', type: 'fuel', description: 'Fuel for processing' },
  CHARCOAL: { name: 'Charcoal', type: 'fuel', description: 'Refined fuel' },
  SPICES: { name: 'Spices', type: 'special', description: 'Rare trade goods' },
  GEMS: { name: 'Gems', type: 'special', description: 'Precious stones' },
  MANA: { name: 'Mana', type: 'special', description: 'Magical energy' },
  COINS: { name: 'Coins', type: 'special', description: 'Currency' },
};

// State
let userId: string = '';
let username: string = '';
let gameState: GameState = {
  city: null,
  resources: [],
  buildings: []
};
let premiumSnapshot: PremiumSnapshot | null = null;
let capitalSnapshot: CapitalSnapshot | null = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helpers
const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const clearScreen = () => {
  console.clear();
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(Math.round(num));
};

const getResourceAmount = (code: string): number => {
  const resource = gameState.resources.find((r) => r.code === code);
  return resource ? resource.amount : 0;
};

const calculateCityUpgradeCost = (level: number) => {
  const multiplier = Math.pow(1.5, Math.max(0, level - 1));
  return {
    coins: Math.floor(1000 * multiplier),
    wood: Math.floor(500 * multiplier),
    stone: Math.floor(500 * multiplier),
  };
};

const formatRequirement = (label: string, have: number, need: number) => {
  const delta = need - have;
  const status = delta <= 0 ? 'ready' : `need ${formatNumber(delta)}`;
  return `${label}: ${formatNumber(have)}/${formatNumber(need)} (${status})`;
};

async function selectContractId(contracts: any[]): Promise<string | null> {
  if (!contracts.length) {
    console.log('No contracts available.');
    return null;
  }

  const raw = (await question('Enter contract number or ID: ')).trim();
  if (!raw) {
    console.log('No selection provided.');
    return null;
  }

  const numeric = Number(raw);
  if (!Number.isNaN(numeric)) {
    const idx = Math.floor(numeric) - 1;
    if (idx >= 0 && idx < contracts.length) {
      return contracts[idx].id;
    }
  }

  const found = contracts.find((c: any) => c.id === raw || c.code === raw);
  if (found) {
    return found.id;
  }

  console.log('Could not find a contract with that identifier.');
  return null;
}

async function selectBundleCode(bundles: any[]): Promise<string | null> {
  if (!bundles.length) {
    console.log('No bundles available.');
    return null;
  }
  const raw = (await question('Enter bundle number or code: ')).trim();
  if (!raw) {
    console.log('No selection provided.');
    return null;
  }
  const numeric = Number(raw);
  if (!Number.isNaN(numeric)) {
    const idx = Math.floor(numeric) - 1;
    if (idx >= 0 && idx < bundles.length) {
      return bundles[idx].code;
    }
  }
  const found = bundles.find((b: any) => b.code === raw || b.id === raw);
  if (found) {
    return found.code;
  }
  console.log('Could not find a bundle with that identifier.');
  return null;
}

// API Client
async function apiCall(path: string, method: string = 'GET', body?: any) {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (userId) {
      headers['X-User-ID'] = userId;
    }

    const url = `${API_URL}${path}${path.includes('?') ? '&' : '?'}userId=${userId}`;
    
    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error((errorData as any).error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`API Error: ${error.message}`);
    return null;
  }
}

async function fetchBestPrices(resourceCode: string) {
  const data = await apiCall(`/api/v1/market/book?resource=${encodeURIComponent(resourceCode)}&limit=3`);
  if (!data) return null;
  const bestBid = data.bids && data.bids.length > 0 ? data.bids[0] : null;
  const bestAsk = data.asks && data.asks.length > 0 ? data.asks[0] : null;
  return {
    bid: bestBid ? { price: bestBid.price, qty: bestBid.qty - bestBid.qty_filled } : null,
    ask: bestAsk ? { price: bestAsk.price, qty: bestAsk.qty - bestAsk.qty_filled } : null,
  };
}

function pickSurplusResource(): Resource | null {
  if (gameState.resources.length === 0) return null;
  const sorted = [...gameState.resources].sort((a, b) => b.amount - a.amount);
  return sorted[0];
}

async function authRequest(path: string, body: Record<string, any>) {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { error: data?.error || `HTTP ${response.status}`, status: response.status };
    }

    return data;
  } catch (error: any) {
    console.error(`Auth Error: ${error.message}`);
    return { error: error.message };
  }
}

async function ensureUserSession(): Promise<boolean> {
  console.log('Welcome to Idle Adventure CLI');
  console.log('Log in with an existing username or create a new one.');
  const rawInput = await question('Enter username (or paste existing user ID, leave empty for random): ');
  const trimmed = rawInput.trim();

  if (trimmed && trimmed.includes('-')) {
    userId = trimmed;
    username = 'Custom User';
    console.log(`Using provided user ID: ${userId}`);
    return true;
  }

  username = trimmed || `user-${Math.floor(Math.random() * 10000)}`;

  console.log(`Authenticating as ${username}...`);
  const loginResult = await authRequest('/api/auth/login', { username });
  if (loginResult && loginResult.userId) {
    userId = loginResult.userId;
    console.log(`Logged in as ${username} (User ID: ${userId})`);
    return true;
  }

  const shouldRegister = !loginResult || loginResult.status === 404;
  if (shouldRegister) {
    console.log(`No existing user found, registering ${username}...`);
    const registerResult = await authRequest('/api/auth/register', { username });
    if (registerResult && registerResult.userId) {
      userId = registerResult.userId;
      console.log(`Registered new user ${username} (User ID: ${userId})`);
      return true;
    }
    console.error(`Failed to register user: ${registerResult?.error || 'Unknown error'}`);
    return false;
  }

  console.error(`Authentication failed: ${loginResult.error || 'Unknown error'}`);
  return false;
}

// Actions
async function refreshState() {
  const data = await apiCall('/api/v1/city');
  if (!data) {
    return false;
  }
  gameState.city = data.city;
  gameState.resources = data.resources;
  gameState.buildings = data.buildings;

  await Promise.all([refreshPremiumSnapshot(), refreshCapitalSnapshot()]);
  return true;
}

async function refreshPremiumSnapshot() {
  const premium = await apiCall('/api/v1/premium/balance');
  if (premium) {
    premiumSnapshot = premium;
  }
}

async function refreshCapitalSnapshot() {
  const capital = await apiCall('/api/v1/world/capital');
  if (capital) {
    capitalSnapshot = capital;
  }
}

async function collectResources() {
  console.log('Collecting resources...');
  const result = await apiCall('/api/v1/city/collect', 'POST', {});
  if (result) {
    console.log('Collection successful!');
    // Log collected amounts if available
    if (result.collected) {
      Object.entries(result.collected).forEach(([res, amount]) => {
        console.log(`+${formatNumber(amount as number)} ${res}`);
      });
    }
  }
  await refreshState();
}

async function upgradeBuilding() {
  console.log('\n--- Upgrade Building ---');
  gameState.buildings.forEach((b, i) => {
    const status = b.is_active ? 'Active' : 'Inactive';
    const upgradeInfo = b.canUpgrade ? `(Cost: ${formatNumber(b.upgradeCost)} coins)` : '(Max Level)';
    console.log(`${i + 1}. ${b.name} (Lvl ${b.level}) - ${status} ${upgradeInfo}`);
  });
  console.log('0. Cancel');

  const answer = await question('Select building to upgrade: ');
  const index = parseInt(answer) - 1;

  if (index >= 0 && index < gameState.buildings.length) {
    const building = gameState.buildings[index];
    console.log(`Upgrading ${building.name}...`);
    const result = await apiCall('/api/v1/city/upgrade', 'POST', { buildingCode: building.code });
    if (result && result.success) {
      console.log(`Successfully upgraded ${building.name} to level ${result.newLevel}!`);
    }
  }
  await refreshState();
}

async function trainTroops() {
  console.log('\n--- Train Troops ---');
  const data = await apiCall('/api/v1/army/troop-types');
  if (!data || !data.troopTypes) return;

  const troopTypes = data.troopTypes;
  troopTypes.forEach((t: any, i: number) => {
    console.log(`${i + 1}. ${t.name} (Power: ${t.basePower}, Cost: ${t.baseCostCoins} coins)`);
  });
  console.log('0. Cancel');

  const answer = await question('Select troop type: ');
  const index = parseInt(answer) - 1;

  if (index >= 0 && index < troopTypes.length) {
    const troop = troopTypes[index];
    const qtyStr = await question(`How many ${troop.name}s to train? `);
    const quantity = parseInt(qtyStr);

    if (quantity > 0) {
      console.log(`Training ${quantity} ${troop.name}s...`);
      const result = await apiCall('/api/v1/army/train', 'POST', { troopTypeId: troop.id, quantity });
      if (result && result.success) {
        console.log('Training started!');
      }
    }
  }
  await refreshState();
}

async function viewArmy() {
  console.log('\n--- Your Army ---');
  const data = await apiCall('/api/v1/army/troops');
  if (data && data.troops) {
    if (data.troops.length === 0) {
      console.log('No troops trained.');
    } else {
      data.troops.forEach((t: any) => {
        console.log(`${t.troopName}: ${formatNumber(t.quantity)} (Power: ${formatNumber(t.totalPower)})`);
      });
    }
  }
  await question('\nPress Enter to continue...');
}

async function viewRoutes() {
    console.log('\n--- Trade Routes ---');
    const data = await apiCall('/api/v1/routes');
    if (data && data.routes) {
        if (data.routes.length === 0) {
            console.log('No active trade routes.');
        } else {
            data.routes.forEach((r: any) => {
                const nextDept = new Date(r.next_departure).toLocaleTimeString();
                console.log(`Route to ${r.to_region_name}: ${r.resource_name} (Next: ${nextDept})`);
            });
        }
    }
    await question('\nPress Enter to continue...');
}

async function levelUpCity() {
    if (!gameState.city) return;
    console.log('\n--- Level Up City ---');
    const costs = calculateCityUpgradeCost(gameState.city.level);
    const coins = getResourceAmount('COINS');
    const wood = getResourceAmount('WOOD');
    const stone = getResourceAmount('STONE');
    console.log(`Next level requires:`);
    console.log(`  ${formatRequirement('Coins', coins, costs.coins)}`);
    console.log(`  ${formatRequirement('Wood', wood, costs.wood)}`);
    console.log(`  ${formatRequirement('Stone', stone, costs.stone)}`);
    const confirm = await question('Attempt to level up city? (y/n): ');
    if (confirm.toLowerCase() === 'y') {
        const result = await apiCall('/api/v1/city/level-up', 'POST', {});
        if (result && result.success) {
            console.log(`City leveled up to ${result.newLevel}! Population grew to ${result.newPopulation}.`);
        }
    }
    await refreshState();
}

async function autoPlay() {
    console.log('\n--- Auto Play Mode ---');
    console.log('Press Ctrl+C to stop.');
    
    while (true) {
        console.log(`\n[${new Date().toLocaleTimeString()}] Auto-collecting...`);
        await collectResources();
        // Also try to upgrade cheapest building if affordable? 
        // For now, just collect.
        
        console.log('Waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
}

async function councilHub() {
  while (true) {
    console.log('\n--- Council Hub ---');
    const summary = await apiCall('/api/v1/council');
    if (summary?.error) {
      console.log(summary.error);
    }
    const council = summary?.council;
    if (council) {
      console.log(`Council: ${council.name} | Region: ${council.region_id}`);
      console.log(`Tax Rate: ${(council.tax_rate * 100).toFixed(2)}% | Treasury: ${formatNumber(council.treasury_balance || 0)} coins`);
      console.log(`Members: ${(summary.members || []).length}`);
    } else {
      console.log('You are not part of a council.');
    }
    console.log('\nOptions:');
    console.log('1. List councils');
    console.log('2. Join council');
    console.log('3. Leave council');
    console.log('4. View chat');
    console.log('5. Send message');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;

    if (choice === '1') {
      const list = await apiCall('/api/v1/council/list');
      if (list?.councils?.length) {
        list.councils.forEach((c: any, idx: number) => {
          console.log(`${idx + 1}. ${c.name} | Region: ${c.region_id} | Members: ${c.members}`);
        });
      } else {
        console.log('No councils found.');
      }
      continue;
    }

    if (choice === '2') {
      const id = await question('Enter council ID to join: ');
      if (id.trim()) {
        await apiCall('/api/v1/council/join', 'POST', { councilId: id.trim() });
      }
      continue;
    }

    if (choice === '3') {
      await apiCall('/api/v1/council/leave', 'POST', {});
      continue;
    }

    if (choice === '4') {
      const chat = await apiCall('/api/v1/council/chat');
      if (chat?.messages?.length) {
        chat.messages.slice().reverse().forEach((msg: any) => {
          const time = new Date(msg.created_at).toLocaleTimeString();
          console.log(`[${time}] ${msg.username}: ${msg.message}`);
        });
      } else {
        console.log('No messages yet.');
      }
      await question('\nPress Enter to continue...');
      continue;
    }

    if (choice === '5') {
      const content = await question('Message: ');
      if (content.trim()) {
        await apiCall('/api/v1/council/chat', 'POST', { message: content.trim() });
      }
      continue;
    }
  }
}

async function realmMapMenu() {
  const data = await apiCall('/api/v1/realm/regions');
  if (!data?.regions) {
    console.log('No region data available.');
    await question('\nPress Enter to continue...');
    return;
  }

  console.log('\n--- Realm Map ---');
  data.regions.forEach((region: any, idx: number) => {
    console.log(`${idx + 1}. ${region.name} (Tier ${region.tier})`);
    console.log(`   Cities: ${region.cityCount}/${region.maxCities} | Councils: ${region.councilCount}`);
    if (region.dominantCouncil) {
      console.log(`   Dominant Council: ${region.dominantCouncil.name} (${region.dominantCouncil.members} members)`);
    }
    console.log(`   Biases: WOOD ${region.biases.wood} | FOOD ${region.biases.food} | STONE ${region.biases.stone}`);
  });

  const move = await question('\nMove city to another region? (enter number or press Enter): ');
  const idx = parseInt(move, 10) - 1;
  if (!isNaN(idx) && data.regions[idx]) {
    const region = data.regions[idx];
    const confirm = await question(`Relocate to ${region.name} for 500 coins? (y/n): `);
    if (confirm.toLowerCase() === 'y') {
      await apiCall('/api/v1/city/move', 'POST', { regionId: region.id });
      await refreshState();
    }
  }
}

async function capitalBoardMenu() {
  while (true) {
    const data = await apiCall('/api/v1/contracts');
    const contracts = data?.contracts || [];

    console.log('\n--- Capital Contract Board ---');
    if (contracts.length) {
      contracts.forEach((contract: any, idx: number) => {
        const label = contract.id || `contract-${idx + 1}`;
        console.log(`${idx + 1}. [${label}] ${contract.title} [${contract.resource_code}]`);
        console.log(`   Need: ${formatNumber(contract.amount_required)} | Reward: ${formatNumber(contract.reward_coins)} coins | Status: ${contract.user_status}`);
        if (contract.progress) {
          console.log(`   Progress: ${formatNumber(contract.progress)}/${formatNumber(contract.amount_required)}`);
        }
      });
    } else {
      console.log('No contracts available.');
    }

    console.log('\nOptions:');
    console.log('1. Accept contract');
    console.log('2. Submit resources');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;

    if (choice === '1') {
      const contractId = await selectContractId(contracts);
      if (contractId) {
        await apiCall('/api/v1/contracts/accept', 'POST', { contractId });
      }
    } else if (choice === '2') {
      const contractId = await selectContractId(contracts);
      if (!contractId) {
        continue;
      }
      const amount = parseInt(await question('Amount to submit: '), 10);
      if (amount > 0) {
        await apiCall('/api/v1/contracts/submit', 'POST', { contractId, amount });
        await refreshState();
      } else {
        console.log('Amount must be greater than zero.');
      }
    }
  }
}

async function premiumMenu() {
  while (true) {
    await refreshPremiumSnapshot();
    const premium = premiumSnapshot;
    console.log('\n--- Shop & Premium ---');
    console.log(`Crowns: ${premium ? formatNumber(premium.crowns) : '0'}`);
    if (premium?.boosts?.length) {
      console.log('Active Boosts:');
      premium.boosts.forEach((boost: any) => {
        const expires = boost.expires_at ? new Date(boost.expires_at).toLocaleTimeString() : 'unknown';
        console.log(`- ${boost.boost_code || boost.code || 'boost'} until ${expires}`);
      });
    } else {
      console.log('No active boosts.');
    }

    const bundlesData = await apiCall('/api/v1/shop/bundles');
    const bundles = bundlesData?.bundles || [];
    if (bundles.length) {
      console.log('\nAvailable Bundles:');
      bundles.forEach((bundle: any, idx: number) => {
        console.log(`${idx + 1}. ${bundle.name} [${bundle.code}] - ${formatNumber(bundle.price)} Crowns`);
        if (bundle.description) {
          console.log(`   ${bundle.description}`);
        }
      });
    } else {
      console.log('\nNo bundles available.');
    }

    console.log('\nOptions:');
    console.log('1. Claim daily stipend');
    console.log('2. Purchase bundle');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;
    if (choice === '1') {
      await apiCall('/api/v1/premium/stipend', 'POST', {});
    } else if (choice === '2') {
      const bundleCode = await selectBundleCode(bundles);
      if (bundleCode) {
        await apiCall('/api/v1/shop/purchase', 'POST', { bundleCode });
        await refreshState();
      }
    }
  }
}

async function cityOperationsMenu() {
  while (true) {
    console.log('\n=== City Operations ===');
    console.log('1. Collect Resources');
    console.log('2. Upgrade Buildings');
    console.log('3. Train Troops');
    console.log('4. View Army');
    console.log('5. View Trade Routes');
    console.log('6. Building Details');
    console.log('7. Resource & Price Insights');
    console.log('8. Level Up City');
    console.log('9. Auto Play (Collect Loop)');
    console.log('0. Back');
    const choice = await question('Select option: ');
    switch (choice) {
      case '1':
        await collectResources();
        break;
      case '2':
        await upgradeBuilding();
        break;
      case '3':
        await trainTroops();
        break;
      case '4':
        await viewArmy();
        break;
      case '5':
        await viewRoutes();
        break;
      case '6':
        await buildingInsightsMenu();
        break;
      case '7':
        await resourceInsightMenu();
        break;
      case '8':
        await levelUpCity();
        break;
      case '9':
        await autoPlay();
        break;
      case '0':
        return;
      default:
        console.log('Invalid option.');
    }
  }
}

async function realmCapitalMenu() {
  while (true) {
    console.log('\n=== Realm & Capital ===');
    console.log('1. Realm Map');
    console.log('2. Capital Contracts Board');
    console.log('3. Capital Affairs');
    console.log('4. World Events');
    console.log('0. Back');
    const choice = await question('Select option: ');
    switch (choice) {
      case '1':
        await realmMapMenu();
        break;
      case '2':
        await capitalBoardMenu();
        break;
      case '3':
        await capitalAffairsMenu();
        break;
      case '4':
        await worldEventsMenu();
        break;
      case '0':
        return;
      default:
        console.log('Invalid option.');
    }
  }
}

async function marketEconomyMenu() {
  while (true) {
    console.log('\n=== Market & Economy ===');
    console.log('1. Market Hub');
    console.log('2. Resource & Price Insights');
    console.log('0. Back');
    const choice = await question('Select option: ');
    switch (choice) {
      case '1':
        await marketMenu();
        break;
      case '2':
        await resourceInsightMenu();
        break;
      case '0':
        return;
      default:
        console.log('Invalid option.');
    }
  }
}

async function socialHubMenu() {
  while (true) {
    console.log('\n=== Social & Chat ===');
    console.log('1. Council Hub');
    console.log('2. World Chat');
    console.log('3. Direct Messages');
    console.log('4. Guilds');
    console.log('0. Back');
    const choice = await question('Select option: ');
    switch (choice) {
      case '1':
        await councilHub();
        break;
      case '2':
        await worldChatMenu();
        break;
      case '3':
        await directMessageMenu();
        break;
      case '4':
        await guildHubMenu();
        break;
      case '0':
        return;
      default:
        console.log('Invalid option.');
    }
  }
}

async function accountMenu() {
  while (true) {
    console.log('\n=== Account & Rewards ===');
    console.log('1. Daily Rewards');
    console.log('2. Account Summary');
    console.log('0. Back');
    const choice = await question('Select option: ');
    switch (choice) {
      case '1':
        await dailyRewardsMenu();
        break;
      case '2':
        console.log('\n--- Account Summary ---');
        console.log(`User: ${username}`);
        console.log(`User ID: ${userId}`);
        console.log(`API URL: ${API_URL}`);
        await question('\nPress Enter to return...');
        break;
      case '0':
        return;
      default:
        console.log('Invalid option.');
    }
  }
}

async function worldChatMenu() {
  while (true) {
    const data = await apiCall('/api/v1/chat/world?limit=25');
    console.log('\n--- World Chat ---');
    if (data?.messages?.length) {
      data.messages
        .slice()
        .reverse()
        .forEach((msg: any) => {
          const time = new Date(msg.created_at).toLocaleTimeString();
          console.log(`[${time}] ${msg.username || msg.user_id}: ${msg.message}`);
        });
    } else {
      console.log('No messages yet. Be the first to speak!');
    }
    console.log('\nOptions:');
    console.log('1. Send message');
    console.log('R. Refresh');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;
    if (choice.toLowerCase() === 'r') continue;
    if (choice === '1') {
      const text = await question('Message: ');
      if (text.trim()) {
        await apiCall('/api/v1/chat/world', 'POST', { message: text.trim() });
      }
    }
  }
}

async function directMessageMenu() {
  let partner = (await question('Enter partner user ID (or blank to cancel): ')).trim();
  if (!partner) return;
  while (true) {
    const convo = await apiCall(`/api/v1/chat/dm?partnerId=${encodeURIComponent(partner)}`);
    console.log(`\n--- DM with ${partner} ---`);
    if (convo?.messages?.length) {
      convo.messages
        .slice()
        .reverse()
        .forEach((msg: any) => {
          const time = new Date(msg.created_at).toLocaleTimeString();
          const author = msg.username || (msg.sender_id === userId ? 'You' : msg.sender_id);
          console.log(`[${time}] ${author}: ${msg.message}`);
        });
    } else {
      console.log('No messages yet.');
    }
    console.log('\nOptions:');
    console.log('1. Send message');
    console.log('2. Change partner');
    console.log('R. Refresh');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;
    if (choice.toLowerCase() === 'r') continue;
    if (choice === '2') {
      partner = (await question('Partner user ID: ')).trim();
      if (!partner) break;
      continue;
    }
    if (choice === '1') {
      const text = await question('Message: ');
      if (text.trim()) {
        await apiCall('/api/v1/chat/dm', 'POST', { partnerId: partner, message: text.trim() });
      }
    }
  }
}

async function capitalAffairsMenu() {
  while (true) {
    await refreshCapitalSnapshot();
    const capital = capitalSnapshot;
    console.log('\n--- Capital Affairs ---');
    if (capital) {
      console.log(`${capital.king.name} decrees: ${capital.king.decree}`);
      console.log(`${capital.king.message}`);
      console.log(`Favor Points: ${formatNumber(capital.favorPoints)}`);
      if (capital.actions?.length) {
        console.log('\nAvailable Contributions:');
        capital.actions.forEach((action, idx) => {
          const requirement = action.costCoins
            ? `${formatNumber(action.costCoins)} coins`
            : `${formatNumber(action.amount)} ${action.resource || action.resourceCode}`;
          console.log(`${idx + 1}. ${action.code} - ${requirement} => +${action.reward} Favor`);
        });
      } else {
        console.log('No contributions requested right now.');
      }
    } else {
      console.log('Capital data unavailable.');
    }
    console.log('\nOptions:');
    console.log('1. Contribute to the capital');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;
    if (choice === '1' && capital?.actions?.length) {
      const raw = await question('Select action number: ');
      const idx = parseInt(raw, 10) - 1;
      const action = capital.actions[idx];
      if (action) {
        await apiCall('/api/v1/world/capital/contribute', 'POST', { action: action.code });
        await refreshState();
      }
    }
  }
}

async function worldEventsMenu() {
  while (true) {
    const data = await apiCall('/api/v1/world/events');
    console.log('\n--- World Events ---');
    if (data?.events?.length) {
      data.events.forEach((event: any, idx: number) => {
        console.log(`${idx + 1}. ${event.name} (${event.event_type})`);
        console.log(`   ${event.description}`);
        const remaining = Math.max(0, Math.floor((event.ends_at - Date.now()) / (60 * 60 * 1000)));
        console.log(`   Ends in: ${remaining}h | Progress: ${formatNumber(event.progress || 0)} / ${formatNumber(event.metadata?.goal || event.metadata?.troopRequired || 0)}`);
      });
    } else {
      console.log('No active events.');
    }
    console.log('\nOptions:');
    console.log('1. Contribute to event');
    console.log('2. Claim rewards');
    console.log('3. View NPC quests');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;
    if (choice === '1') {
      const eventIdx = parseInt(await question('Event number: '), 10) - 1;
      const event = data?.events?.[eventIdx];
      if (!event) {
        console.log('Invalid selection.');
        continue;
      }
      let payload: any = { eventId: event.id };
      if (event.metadata?.resource) {
        const amount = parseInt(await question(`Amount of ${event.metadata.resource} to contribute: `), 10);
        if (!amount || amount <= 0) {
          console.log('Invalid amount.');
          continue;
        }
        payload.amount = amount;
      } else if (event.metadata?.troopRequired) {
        console.log('Sending troops (placeholder).');
      }
      await apiCall('/api/v1/world/events/contribute', 'POST', payload);
    } else if (choice === '2') {
      const eventIdx = parseInt(await question('Event number: '), 10) - 1;
      const event = data?.events?.[eventIdx];
      if (!event) {
        console.log('Invalid selection.');
        continue;
      }
      await apiCall('/api/v1/world/events/claim', 'POST', { eventId: event.id });
    } else if (choice === '3') {
      const quests = await apiCall('/api/v1/npc/quests');
      console.log('\n--- NPC Quests ---');
      quests?.quests?.forEach((quest: any, idx: number) => {
        console.log(`${idx + 1}. ${quest.npc_name} - ${quest.title} [${quest.status}]`);
        console.log(`   ${quest.description}`);
      });
      await question('\nPress Enter to return...');
    }
  }
}

async function guildHubMenu() {
  while (true) {
    const data = await apiCall('/api/v1/guilds');
    console.log('\n--- Guild Hub ---');
    if (data?.membership) {
      console.log(`Current Guild: ${data.membership.guild_code}`);
    } else {
      console.log('You are not in a guild.');
    }
    if (data?.guilds?.length) {
      data.guilds.forEach((g: any, idx: number) => {
        const perks = Object.entries(g.perks || {})
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');
        console.log(`${idx + 1}. ${g.name} [${g.code}]${g.isMember ? ' (Member)' : ''}`);
        console.log(`   ${g.description}`);
        console.log(`   Perks: ${perks}`);
      });
    } else {
      console.log('No guild archetypes found.');
    }
    console.log('\nOptions:');
    console.log('1. Join guild');
    console.log('2. Leave guild');
    console.log('0. Back');
    const choice = await question('Select option: ');
    if (choice === '0') break;
    if (choice === '1') {
      const code = await question('Enter guild code: ');
      if (code.trim()) {
        await apiCall('/api/v1/guilds/join', 'POST', { guildCode: code.trim().toUpperCase() });
        await refreshState();
      }
    } else if (choice === '2') {
      await apiCall('/api/v1/guilds/leave', 'POST', {});
      await refreshState();
    }
  }
}

async function simpleSellFlow(resourceCode?: string) {
  if (!resourceCode) {
    const res = pickSurplusResource();
    if (!res) {
      console.log('No resources available to sell.');
      return;
    }
    resourceCode = res.code;
  }

  const amount = getResourceAmount(resourceCode);
  if (amount <= 0) {
    console.log(`No ${resourceCode} available to sell.`);
    return;
  }

  const qty = Math.max(1, Math.floor(amount * 0.25));
  console.log(`Selling ${formatNumber(qty)} ${resourceCode}...`);
  const result = await apiCall('/api/v1/market/quick-sell', 'POST', { resource: resourceCode, qty });
  if (result && result.success) {
    const gross = result.price * result.qty;
    console.log(`Sold ${formatNumber(result.qty)} ${resourceCode} @ ${formatNumber(result.price)} coins (${formatNumber(gross)} before tax).`);
    await refreshState();
  }
}

async function simpleBuyFlow(resourceCode: string, qty: number) {
  console.log(`Buying ${formatNumber(qty)} ${resourceCode}...`);
  const result = await apiCall('/api/v1/market/quick-buy', 'POST', { resource: resourceCode, qty });
  if (result && result.success) {
    console.log(`Bought ${formatNumber(result.qty)} ${resourceCode} @ ${formatNumber(result.price)} coins.`);
    await refreshState();
  }
}

async function dailyRewardsMenu() {
  console.log('\n--- Daily Rewards ---');
  const status = await apiCall('/api/daily-rewards/status');
  if (!status) return;

  const lastClaimLabel = status.lastClaimDate
    ? new Date(status.lastClaimDate).toLocaleDateString()
    : 'Never';

  console.log(`Current streak: ${status.currentStreak} days`);
  console.log(`Longest streak: ${status.longestStreak || 0} days`);
  console.log(`Last claimed: ${lastClaimLabel}`);
  console.log(`Can claim today: ${status.canClaim ? 'Yes' : 'No'}`);

  if (status.canClaim) {
    const claim = await question('Claim today\'s reward? (y/n): ');
    if (claim.toLowerCase() === 'y') {
      const result = await apiCall('/api/daily-rewards/claim', 'POST', {});
      if (result && result.success) {
        console.log(`Claimed ${result.reward.value} ${result.reward.type}! Streak is now ${result.streak}.`);
        await refreshState();
      }
    }
  }

  await question('\nPress Enter to return to the dashboard...');
}

async function viewOrderBook() {
  const code = (await question('Enter resource code (e.g., WOOD): ')).trim().toUpperCase() || 'WOOD';
  const data = await apiCall(`/api/v1/market/book?resource=${encodeURIComponent(code)}&limit=10`);
  if (!data) return;

  console.log(`\n--- Order Book: ${code} ---`);
  console.log('Top Bids (buyers):');
  if (!data.bids || data.bids.length === 0) {
    console.log('  None');
  } else {
    data.bids.slice(0, 5).forEach((bid: any) => {
      console.log(`  ${formatNumber(bid.price)} coins x ${formatNumber(bid.qty - bid.qty_filled)} (${bid.city_name})`);
    });
  }

  console.log('\nTop Asks (sellers):');
  if (!data.asks || data.asks.length === 0) {
    console.log('  None');
  } else {
    data.asks.slice(0, 5).forEach((ask: any) => {
      console.log(`  ${formatNumber(ask.price)} coins x ${formatNumber(ask.qty - ask.qty_filled)} (${ask.city_name})`);
    });
  }
}

async function quickSellResource() {
  const code = (await question('Resource code to sell (e.g., WOOD): ')).trim().toUpperCase() || 'WOOD';
  const qtyInput = await question('Quantity to sell: ');
  const qty = parseInt(qtyInput, 10);
  if (!qty || qty <= 0) {
    console.log('Quantity must be a positive number.');
    return;
  }

  const result = await apiCall('/api/v1/market/quick-sell', 'POST', { resource: code, qty });
  if (result && result.success) {
    console.log(`Sold ${formatNumber(result.qty)} ${code} for ${formatNumber(result.price * result.qty)} coins (pre-tax).`);
    await refreshState();
  }
}

async function quickBuyResource() {
  const code = (await question('Resource code to buy (e.g., WOOD): ')).trim().toUpperCase() || 'WOOD';
  const qtyInput = await question('Quantity to buy: ');
  const qty = parseInt(qtyInput, 10);
  if (!qty || qty <= 0) {
    console.log('Quantity must be a positive number.');
    return;
  }

  const result = await apiCall('/api/v1/market/quick-buy', 'POST', { resource: code, qty });
  if (result && result.success) {
    console.log(`Bought ${formatNumber(result.qty)} ${code} at ${formatNumber(result.price)} coins each.`);
    await refreshState();
  }
}

async function marketMenu() {
  while (true) {
    console.log('\n--- Market Hub ---');
    console.log('1. View Order Book');
    console.log('2. Quick Sell Resource');
    console.log('3. Quick Buy Resource');
    console.log('4. Sell Surplus (25%)');
    console.log('5. Buy Essentials (100 Food)');
    console.log('0. Back');
    const choice = await question('Select option: ');

    switch (choice.trim()) {
      case '1':
        await viewOrderBook();
        break;
      case '2':
        await quickSellResource();
        break;
      case '3':
        await quickBuyResource();
        break;
      case '4':
        await simpleSellFlow();
        break;
      case '5':
        await simpleBuyFlow('FOOD', 100);
        break;
      case '0':
        return;
      default:
        console.log('Invalid option.');
    }
  }
}

async function resourceInsightMenu() {
  console.log('\n--- Resources & Market ---');
  if (!gameState.city) {
    console.log('No city data.');
    return;
  }

  const ownedCodes = gameState.resources.map((r) => r.code);
  const focusList = ownedCodes.length > 0 ? ownedCodes : ['WOOD', 'STONE', 'FOOD'];
  for (const code of focusList) {
    const metadata = RESOURCE_METADATA[code] || { name: code, type: 'unknown', description: '' };
    const amount = getResourceAmount(code);
    let priceLine = 'no market data';
    const prices = await fetchBestPrices(code);
    if (prices) {
      const bidStr = prices.bid ? `${formatNumber(prices.bid.price)} (${formatNumber(prices.bid.qty)} qty)` : 'none';
      const askStr = prices.ask ? `${formatNumber(prices.ask.price)} (${formatNumber(prices.ask.qty)} qty)` : 'none';
      priceLine = `bid ${bidStr} | ask ${askStr}`;
    }
    console.log(`\n${metadata.name} [${code}] - ${metadata.type}`);
    console.log(`Amount: ${formatNumber(amount)}`);
    console.log(`Market: ${priceLine}`);
    if (metadata.description) {
      console.log(`${metadata.description}`);
    }
  }

  const action = await question('\nSell surplus of top resource? (y/n): ');
  if (action.toLowerCase() === 'y') {
    await simpleSellFlow();
  }
  await question('\nPress Enter to return...');
}

async function buildingInsightsMenu() {
  if (!gameState.city) return;
  console.log('\n--- Building Insights ---');
  gameState.buildings.forEach((b, idx) => {
    console.log(`\n${idx + 1}. ${b.name} (Lvl ${b.level}) ${b.is_active ? '' : '[Paused]'}`);
    console.log(`   Upgrade Cost: ${formatNumber(b.upgradeCost)} coins ${b.canUpgrade ? '' : '(Max level)'}`);
    if (b.productionRate && Object.keys(b.productionRate).length > 0) {
      const prod = Object.entries(b.productionRate)
        .map(([res, amt]) => `${res}+${formatNumber(amt)}/tick`)
        .join(', ');
      console.log(`   Production: ${prod}`);
    }
    if (b.consumptionRate && Object.keys(b.consumptionRate).length > 0) {
      const cons = Object.entries(b.consumptionRate)
        .map(([res, amt]) => `${res}-${formatNumber(amt)}/tick`)
        .join(', ');
      console.log(`   Consumption: ${cons}`);
    }
    if (b.outputRate && Object.keys(b.outputRate).length > 0) {
      const out = Object.entries(b.outputRate)
        .map(([res, amt]) => `${res}+${formatNumber(amt)}/tick`)
        .join(', ');
      console.log(`   Output: ${out}`);
    }
  });
  await question('\nPress Enter to return...');
}

// UI
function printDashboard() {
  clearScreen();
  if (!gameState.city) return;

  console.log('==================================================');
  console.log(`  ${gameState.city.name} (Level ${gameState.city.level})`);
  console.log(`  Region: ${gameState.city.region_name} | Pop: ${formatNumber(gameState.city.population)}`);
  console.log('==================================================');
  if (premiumSnapshot || capitalSnapshot) {
    const crowns = premiumSnapshot ? formatNumber(premiumSnapshot.crowns) : '0';
    const favor = capitalSnapshot ? formatNumber(capitalSnapshot.favorPoints) : '0';
    console.log(`Crowns: ${crowns} | Capital Favor: ${favor}`);
    if (capitalSnapshot?.king) {
      console.log(`Decree: ${capitalSnapshot.king.decree}`);
    }
  }
  
  console.log('\nResources:');
  const resStr = gameState.resources
    .map(r => `${r.name}: ${formatNumber(r.amount)}`)
    .join(' | ');
  console.log(resStr);

  console.log('\nBuildings:');
  // Group buildings slightly better or just list simplified
  gameState.buildings.slice(0, 5).forEach(b => {
      console.log(`- ${b.name} (Lvl ${b.level})`);
  });
  if (gameState.buildings.length > 5) console.log(`...and ${gameState.buildings.length - 5} more`);

  const costs = calculateCityUpgradeCost(gameState.city.level);
  const coins = getResourceAmount('COINS');
  const wood = getResourceAmount('WOOD');
  const stone = getResourceAmount('STONE');
  console.log('\nNext City Level Requirements:');
  console.log(`  ${formatRequirement('Coins', coins, costs.coins)}`);
  console.log(`  ${formatRequirement('Wood', wood, costs.wood)}`);
  console.log(`  ${formatRequirement('Stone', stone, costs.stone)}`);

  console.log('\n--------------------------------------------------');
  console.log('1. City Operations');
  console.log('2. Realm & Capital');
  console.log('3. Market & Economy');
  console.log('4. Social & Chat');
  console.log('5. Account & Rewards');
  console.log('6. Shop & Premium');
  console.log('R. Refresh');
  console.log('Q. Quit');
  console.log('--------------------------------------------------');
}

async function main() {
  const authenticated = await ensureUserSession();
  if (!authenticated) {
    console.log('Could not authenticate. Exiting.');
    rl.close();
    return;
  }

  console.log('Connecting to game...');
  let success = await refreshState();
  
  if (!success) {
    console.log(`Failed to connect to ${API_URL}`);
    const newUrl = await question('Enter API URL (leave empty to quit): ');
    if (newUrl.trim()) {
        API_URL = newUrl.trim().replace(/\/$/, ''); // Remove trailing slash
        console.log(`Retrying with ${API_URL}...`);
        success = await refreshState();
    }
  }

  if (!success) {
    console.log('Failed to connect. Exiting.');
    rl.close();
    return;
  }


  while (true) {
    printDashboard();
    const choice = await question('Select action: ');

    switch (choice.toLowerCase()) {
      case '1':
        await cityOperationsMenu();
        break;
      case '2':
        await realmCapitalMenu();
        break;
      case '3':
        await marketEconomyMenu();
        break;
      case '4':
        await socialHubMenu();
        break;
      case '5':
        await accountMenu();
        break;
      case '6':
        await premiumMenu();
        break;
      case 'r':
        await refreshState();
        break;
      case 'q':
        console.log('Goodbye!');
        rl.close();
        return;
      default:
        // Just refresh loop
        break;
    }
  }
}

main().catch(console.error);

