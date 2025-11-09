/**
 * CityDO - Per-city authoritative state Durable Object
 * Manages city state, command queue, and tick processing
 */

import { CityState, Command, BuildCommand, TrainCommand, LawSetCommand } from '../types/kingdoms-persist';

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

    // Initialize state if needed
    let cityState = await this.state.storage.get<CityState>('state');
    if (!cityState) {
      cityState = await this.initializeState();
      await this.state.storage.put('state', cityState);
    }

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
        build: [],
        train: [],
      },
      version: 1,
      seed: Math.floor(Math.random() * 1000000),
    };
  }

  private async getState(): Promise<Response> {
    const state = await this.state.storage.get<CityState>('state');
    if (!state) {
      return Response.json({ error: 'State not initialized' }, { status: 500 });
    }
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
    const now = Date.now();
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
    const state = await this.state.storage.get<CityState>('state');
    if (!state) {
      return Response.json({ error: 'State not initialized' }, { status: 500 });
    }
    const queue = (await this.state.storage.get<Command[]>('commandQueue')) || [];

    // Load ruleset
    const ruleset = await this.loadRuleset('v1');

    // Process commands
    for (const command of queue) {
      await this.applyCommand(state, command, ruleset);
    }

    // Process queues
    await this.processQueues(state, ruleset);

    // Apply upkeep
    await this.applyUpkeep(state, ruleset);

    // Run production
    await this.runProduction(state, ruleset);

    // Resolve expeditions
    await this.resolveExpeditions(state, ruleset);

    // Increment version
    state.version += 1;
    state.ticks += 1;

    // Save state
    await this.state.storage.put('state', state);
    await this.state.storage.put('commandQueue', []); // Clear queue

    return Response.json({
      tick: state.ticks,
      version: state.version,
    });
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

    // Add to build queue
    state.queues.build.push({
      type: 'BUILD',
      building: cmd.building,
      slot: cmd.slot,
      client_time: cmd.client_time,
    });
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

    // Add to train queue
    state.queues.train.push({
      type: 'TRAIN',
      unit: cmd.unit,
      qty: cmd.qty,
      client_time: cmd.client_time,
    });
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
    const completedBuilds: BuildCommand[] = [];
    for (const build of state.queues.build) {
      const buildingDef = ruleset.buildings[build.building];
      if (!buildingDef) continue;

      // Simple time-based completion (in real implementation, track start time)
      // For MVP, assume builds complete after N ticks
      completedBuilds.push(build);
    }

    for (const build of completedBuilds) {
      state.buildings.push({
        id: `b_${build.building}_${build.slot}`,
        lvl: 1,
        slot: build.slot,
      });
      state.queues.build = state.queues.build.filter(b => b !== build);
    }

    // Process train queue (similar logic)
    const completedTrains: TrainCommand[] = [];
    for (const train of state.queues.train) {
      completedTrains.push(train);
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
    // Run production for each building
    for (const building of state.buildings) {
      const buildingDef = ruleset.buildings[building.id.split('_')[1]];
      if (!buildingDef?.production) continue;

      for (const [resource, amount] of Object.entries(buildingDef.production)) {
        state.resources[resource] = (state.resources[resource] || 0) + (amount as number);
      }
    }
  }

  private async resolveExpeditions(state: CityState, ruleset: any): Promise<void> {
    // TODO: Check for returning expeditions and resolve outcomes
  }

  private async loadRuleset(rulesetId: string): Promise<any> {
    // In real implementation, load from KV
    return {
      buildings: {},
      units: {},
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
}

