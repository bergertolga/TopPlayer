/**
 * CityDO - Per-city authoritative state Durable Object
 * Manages city state, command queue, and tick processing
 */

import {
  CityState,
  Command,
  BuildCommand,
  TrainCommand,
  LawSetCommand,
  BuildQueueEntry,
  TrainQueueEntry,
} from '../types/kingdoms-persist';

export interface CityTickOptions {
  stateOverride?: Partial<CityState>;
  queueOverride?: Command[];
  ticks?: number;
  dtMs?: number;
}

export const CITY_TICK_DURATION_MS = 5 * 60 * 1000; // 5 minutes per simulation tick
export const DEFAULT_BUILD_TIME_TICKS = 3;
const DEFAULT_TRAIN_TIME_TICKS = 2;

export class CityDO {
  private state: DurableObjectState;
  private env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    await this.ensureState();

    if (path === '/state') {
      return this.getState();
    } else if (path === '/command') {
      return this.handleCommand(request);
    } else if (path === '/tick') {
      return this.processTick();
    }

    return new Response('Not found', { status: 404 });
  }

  private async initializeState(): Promise<CityState> {
    return {
      ticks: 0,
      resources: {
        grain: 300,
        timber: 100,
        stone: 60,
        coins: 1000,
        rations: 0,
      },
      labor: {
        free: 50,
        assigned: {},
      },
      buildings: [],
      laws: {
        tax: 0.08,
        market_fee: 0.02,
        rationing: 'normal',
      },
      units: {},
      heroes: [],
      queues: {
        build: [] as BuildQueueEntry[],
        train: [] as TrainQueueEntry[],
      },
      version: 1,
      seed: this.randomInt(1000000),
    };
  }

  private async getState(): Promise<Response> {
    const state = await this.ensureState();
    return Response.json({
      state,
      version: state.version,
    });
  }

  private async handleCommand(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const command: Command = await request.json();
    
    // Validate command timestamp (reject stale commands)
    const now = this.currentTime();
    const maxAge = 60000; // 1 minute
    if (command.client_time < now - maxAge) {
      return Response.json({
        accepted: false,
        error: 'Command too old',
      });
    }

    // Validate command structure
    if (!(await this.validateCommand(command))) {
      return Response.json({
        accepted: false,
        error: 'Invalid command',
      });
    }

    // Enqueue command
    const commandId = crypto.randomUUID();
    command.id = commandId;
    const commandQueue = (await this.state.storage.get<Command[]>('commandQueue')) || [];
    commandQueue.push(command);
    await this.state.storage.put('commandQueue', commandQueue);

    return Response.json({
      accepted: true,
      command_id: commandId,
    });
  }

  private async validateCommand(command: Command): Promise<boolean> {
    switch (command.type) {
      case 'BUILD':
        return await this.validateBuildCommand(command as BuildCommand);
      case 'TRAIN':
        return this.validateTrainCommand(command as TrainCommand);
      case 'LAW_SET':
        return this.validateLawSetCommand(command as LawSetCommand);
      default:
        return true; // Other commands validated elsewhere
    }
  }

  private async validateBuildCommand(cmd: BuildCommand): Promise<boolean> {
    // Check if building slot is available
    const state = await this.state.storage.get<CityState>('state');
    if (!state) return false;
    const existingBuilding = state.buildings.find(b => b.slot === cmd.slot);
    if (existingBuilding) {
      return false;
    }
    // TODO: Check if player has resources
    return true;
  }

  private validateTrainCommand(cmd: TrainCommand): boolean {
    // TODO: Check if player has resources and capacity
    return cmd.qty > 0 && cmd.qty <= 1000;
  }

  private validateLawSetCommand(cmd: LawSetCommand): boolean {
    if (cmd.tax !== undefined && (cmd.tax < 0 || cmd.tax > 1)) {
      return false;
    }
    if (cmd.market_fee !== undefined && (cmd.market_fee < 0 || cmd.market_fee > 0.1)) {
      return false;
    }
    return true;
  }

  private async processTick(): Promise<Response> {
    const state = await this.ensureState();
    const queue = (await this.state.storage.get<Command[]>('commandQueue')) || [];

    // Load ruleset
    const ruleset = await this.loadRuleset('v1');

    await this.runTick(state, queue, ruleset);

    // Save state
    await this.state.storage.put('state', state);
    await this.state.storage.put('commandQueue', []); // Clear queue

    return Response.json({
      tick: state.ticks,
      version: state.version,
    });
  }

  async processTickForTest(options: CityTickOptions = {}): Promise<CityState> {
    const state = await this.ensureState();
    const baseQueue =
      options.queueOverride ?? (await this.state.storage.get<Command[]>('commandQueue')) ?? [];

    if (options.stateOverride) {
      this.applyStateOverrides(state, options.stateOverride);
    }

    const ruleset = await this.loadRuleset('v1');
    const totalTicks = this.resolveTickCount(options);

    for (let step = 0; step < totalTicks; step++) {
      const queue = step === 0 ? baseQueue : [];
      await this.runTick(state, queue, ruleset);
    }

    await this.state.storage.put('state', state);
    await this.state.storage.put('commandQueue', []);
    return this.cloneState(state);
  }

  private async applyCommand(state: CityState, command: Command, ruleset: any): Promise<void> {
    switch (command.type) {
      case 'BUILD':
        await this.applyBuildCommand(state, command as BuildCommand, ruleset);
        break;
      case 'TRAIN':
        await this.applyTrainCommand(state, command as TrainCommand, ruleset);
        break;
      case 'LAW_SET':
        await this.applyLawSetCommand(state, command as LawSetCommand);
        break;
    }
  }

  private async applyBuildCommand(state: CityState, cmd: BuildCommand, ruleset: any): Promise<void> {
    const buildingDef = ruleset.buildings[cmd.building];
    if (!buildingDef) return;

    // Check costs
    if (!this.hasResources(state, buildingDef.cost)) {
      return;
    }

    // Deduct costs
    this.deductResources(state, buildingDef.cost);

    // Add to build queue with timing metadata
    state.queues.build.push(this.createBuildQueueEntry(state, cmd, buildingDef));
  }

  private async applyTrainCommand(state: CityState, cmd: TrainCommand, ruleset: any): Promise<void> {
    const unitDef = ruleset.units[cmd.unit];
    if (!unitDef) return;

    // Check costs
    const totalCost: Record<string, number> = {};
    for (const [resource, amount] of Object.entries(unitDef.cost)) {
      totalCost[resource] = (amount as number) * cmd.qty;
    }

    if (!this.hasResources(state, totalCost)) {
      return;
    }

    // Deduct costs
    this.deductResources(state, totalCost);

    // Add to train queue with timing metadata
    state.queues.train.push(this.createTrainQueueEntry(state, cmd, unitDef));
  }

  private async applyLawSetCommand(state: CityState, cmd: LawSetCommand): Promise<void> {
    if (cmd.tax !== undefined) {
      state.laws.tax = cmd.tax;
    }
    if (cmd.market_fee !== undefined) {
      state.laws.market_fee = cmd.market_fee;
    }
    if (cmd.rationing !== undefined) {
      state.laws.rationing = cmd.rationing;
    }
  }

  private async processQueues(state: CityState, ruleset: any): Promise<void> {
    // Process build queue
    const completedBuilds: BuildQueueEntry[] = [];
    for (const build of state.queues.build) {
      const buildingDef = ruleset.buildings[build.building];
      if (!buildingDef) continue;

      this.ensureBuildQueueTiming(build, buildingDef, state.ticks);
      if (state.ticks >= build.ready_at_tick) {
        completedBuilds.push(build);
      }
    }

    for (const build of completedBuilds) {
      state.buildings.push({
        id: `b_${build.building}_${build.slot}`,
        lvl: 1,
        slot: build.slot,
      });
      state.queues.build = state.queues.build.filter(b => b !== build);
    }

    // Process train queue
    const completedTrains: TrainQueueEntry[] = [];
    for (const train of state.queues.train) {
      this.ensureTrainQueueTiming(train, state.ticks, ruleset.units[train.unit]);
      if (state.ticks >= train.ready_at_tick) {
        completedTrains.push(train);
      }
    }

    for (const train of completedTrains) {
      state.units[train.unit] = (state.units[train.unit] || 0) + train.qty;
      state.queues.train = state.queues.train.filter(t => t !== train);
    }
  }

  private async applyUpkeep(state: CityState, ruleset: any): Promise<void> {
    // Calculate labor upkeep (0.25 grain per labor per day)
    const laborUpkeep = state.labor.free * 0.25 / 8640; // Per tick (10s = 8640 ticks/day)
    
    // Calculate military upkeep (0.5 rations per unit per day)
    let militaryUpkeep = 0;
    for (const [unit, count] of Object.entries(state.units)) {
      const unitDef = ruleset.units[unit];
      if (unitDef?.upkeep?.rations) {
        militaryUpkeep += count * unitDef.upkeep.rations / 8640;
      }
    }

    // Deduct upkeep
    state.resources.grain = Math.max(0, (state.resources.grain || 0) - laborUpkeep);
    state.resources.rations = Math.max(0, (state.resources.rations || 0) - militaryUpkeep);
  }

  private async runProduction(state: CityState, ruleset: any): Promise<void> {
    // Base production per tick (every 5 minutes = 300 seconds)
    // For MVP: Simple base production that scales with buildings
    
    // Base resource production per tick (scaled for 5-minute ticks)
    const baseProductionPerTick: Record<string, number> = {
      coins: 5,      // 5 coins per tick = 60 coins/hour = 1440 coins/day
      grain: 10,     // 10 grain per tick
      timber: 8,     // 8 timber per tick
      stone: 5,      // 5 stone per tick
    };

    // Apply base production
    for (const [resource, amount] of Object.entries(baseProductionPerTick)) {
      state.resources[resource] = (state.resources[resource] || 0) + amount;
    }

    // Building-based production multipliers
    for (const building of state.buildings) {
      const buildingType = this.getBuildingType(building.id);
      const level = building.lvl || 1;
      
      // Simple building production bonuses
      switch (buildingType) {
        case 'farm':
          state.resources.grain = (state.resources.grain || 0) + (5 * level);
          break;
        case 'lumber_mill':
          state.resources.timber = (state.resources.timber || 0) + (4 * level);
          break;
        case 'quarry':
          state.resources.stone = (state.resources.stone || 0) + (3 * level);
          break;
        case 'market':
          state.resources.coins = (state.resources.coins || 0) + (2 * level);
          break;
      }
    }
  }

  private async resolveExpeditions(state: CityState, ruleset: any): Promise<void> {
    // TODO: Check for returning expeditions and resolve outcomes
  }

  private async loadRuleset(rulesetId: string): Promise<any> {
    // Simple ruleset for MVP - in production, load from KV
    return {
      buildings: {
        farm: {
          cost: { timber: 50, stone: 30 },
          production: { grain: 5 },
          build_time_ticks: 3,
        },
        lumber_mill: {
          cost: { timber: 40, stone: 20 },
          production: { timber: 4 },
          build_time_ticks: 4,
        },
        quarry: {
          cost: { timber: 30, stone: 10 },
          production: { stone: 3 },
          build_time_ticks: 4,
        },
        market: {
          cost: { timber: 60, stone: 40, coins: 200 },
          production: { coins: 2 },
          build_time_ticks: 5,
        },
      },
      units: {
        worker: {
          cost: { coins: 10, grain: 5 },
          upkeep: { rations: 0.5 },
        },
      },
      recipes: {},
    };
  }

  private hasResources(state: CityState, costs: Record<string, number>): boolean {
    for (const [resource, amount] of Object.entries(costs)) {
      if ((state.resources[resource] || 0) < amount) {
        return false;
      }
    }
    return true;
  }

  private deductResources(state: CityState, costs: Record<string, number>): void {
    for (const [resource, amount] of Object.entries(costs)) {
      state.resources[resource] = Math.max(0, (state.resources[resource] || 0) - amount);
    }
  }

  private async ensureState(): Promise<CityState> {
    let state = await this.state.storage.get<CityState>('state');
    if (!state) {
      state = await this.initializeState();
      await this.state.storage.put('state', state);
    }
    return state;
  }

  private currentTime(): number {
    if (this.env?.TEST_CLOCK?.now) {
      return this.env.TEST_CLOCK.now();
    }
    return Date.now();
  }

  private random(): number {
    if (this.env?.TEST_RNG?.next) {
      return this.env.TEST_RNG.next();
    }
    return Math.random();
  }

  private randomInt(max: number): number {
    return Math.floor(this.random() * max);
  }

  private getBuildingType(buildingId: string): string {
    const parts = buildingId.split('_');
    if (parts.length <= 2) {
      return parts[1] || buildingId;
    }
    return parts.slice(1, -1).join('_');
  }

  private applyStateOverrides(state: CityState, overrides: Partial<CityState>): void {
    if (overrides.resources) {
      state.resources = {
        ...state.resources,
        ...overrides.resources,
      };
    }

    if (overrides.labor) {
      state.labor = {
        ...state.labor,
        ...overrides.labor,
        assigned: {
          ...state.labor.assigned,
          ...(overrides.labor.assigned ?? {}),
        },
      };
    }

    if (overrides.buildings) {
      state.buildings = overrides.buildings;
    }

    if (overrides.laws) {
      state.laws = {
        ...state.laws,
        ...overrides.laws,
      };
    }

    if (overrides.units) {
      state.units = {
        ...state.units,
        ...overrides.units,
      };
    }

    if (overrides.heroes) {
      state.heroes = overrides.heroes;
    }

    if (overrides.queues) {
      state.queues = {
        ...state.queues,
        ...overrides.queues,
      };
    }

    if (typeof overrides.ticks === 'number') {
      state.ticks = overrides.ticks;
    }

    if (typeof overrides.version === 'number') {
      state.version = overrides.version;
    }

    if (typeof overrides.seed === 'number') {
      state.seed = overrides.seed;
    }
  }

  private async runTick(state: CityState, queue: Command[], ruleset: any): Promise<void> {
    for (const command of queue) {
      await this.applyCommand(state, command, ruleset);
    }

    await this.applyUpkeep(state, ruleset);
    await this.runProduction(state, ruleset);
    await this.resolveExpeditions(state, ruleset);

    state.version += 1;
    state.ticks += 1;

    await this.processQueues(state, ruleset);
  }

  private resolveTickCount(options: CityTickOptions): number {
    if (options.ticks && options.ticks > 0) {
      return Math.floor(options.ticks);
    }
    if (options.dtMs && options.dtMs > 0) {
      return Math.max(1, Math.floor(options.dtMs / CITY_TICK_DURATION_MS));
    }
    return 1;
  }

  private cloneState<T>(value: T): T {
    const globalClone = (globalThis as any).structuredClone;
    if (typeof globalClone === 'function') {
      return globalClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  private createBuildQueueEntry(state: CityState, cmd: BuildCommand, buildingDef: any): BuildQueueEntry {
    const buildTime = this.getBuildTimeTicks(cmd.building, buildingDef);
    return {
      ...cmd,
      started_at_tick: state.ticks,
      ready_at_tick: state.ticks + buildTime,
    };
  }

  private createTrainQueueEntry(state: CityState, cmd: TrainCommand, unitDef: any): TrainQueueEntry {
    const trainTime = this.getTrainTimeTicks(cmd.unit, unitDef);
    return {
      ...cmd,
      started_at_tick: state.ticks,
      ready_at_tick: state.ticks + trainTime,
    };
  }

  private ensureBuildQueueTiming(entry: BuildQueueEntry, buildingDef: any, currentTick: number): void {
    if (typeof entry.ready_at_tick === 'number' && typeof entry.started_at_tick === 'number') {
      return;
    }

    const buildTime = this.getBuildTimeTicks(entry.building, buildingDef);
    entry.started_at_tick = currentTick;
    entry.ready_at_tick = currentTick + buildTime;
  }

  private ensureTrainQueueTiming(
    entry: TrainQueueEntry,
    currentTick: number,
    unitDef: any
  ): void {
    if (typeof entry.ready_at_tick === 'number' && typeof entry.started_at_tick === 'number') {
      return;
    }

    const trainTime = this.getTrainTimeTicks(entry.unit, unitDef);
    entry.started_at_tick = currentTick;
    entry.ready_at_tick = currentTick + trainTime;
  }

  private getBuildTimeTicks(_building: string, buildingDef: any): number {
    if (buildingDef?.build_time_ticks) {
      return Math.max(1, buildingDef.build_time_ticks);
    }
    return DEFAULT_BUILD_TIME_TICKS;
  }

  private getTrainTimeTicks(_unit: string, unitDef: any): number {
    if (unitDef?.train_time_ticks) {
      return Math.max(1, unitDef.train_time_ticks);
    }
    return DEFAULT_TRAIN_TIME_TICKS;
  }
}

