import { Miniflare } from 'miniflare';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type {
  DurableObjectId,
  DurableObjectNamespace,
  DurableObjectState,
  DurableObjectStorage,
  DurableObjectStub,
  D1Database,
} from '@cloudflare/workers-types';
import { CityDO, type CityTickOptions } from '../../src/durable-objects/city-do';
import { KingdomDO } from '../../src/durable-objects/kingdom-do';
import { MarketDO, type OrdersState } from '../../src/durable-objects/market';
import type { Env } from '../../src/types';
import type { CityState, Command, KingdomState } from '../../src/types/kingdoms-persist';

const helpersDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(helpersDir, '..', '..');
const migrationsDir = path.join(projectRoot, 'migrations');
const scriptsDir = path.join(projectRoot, 'scripts');

export interface TestRuntime {
  clock: TestClock;
  rng: TestRNG;
  env: Env & TestEnvExtensions;
  db: D1Database;
  newCityStub(initialState?: CityState, options?: CityStubOptions): Promise<CityTestHarness>;
  newKingdomStub(initialState?: KingdomState): Promise<KingdomTestHarness>;
  newMarketStub(resourceCode: string, options?: MarketStubOptions): Promise<MarketTestHarness>;
  dispose(): Promise<void>;
}

export interface CityTestHarness {
  id: string;
  instance: CityDO;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  processTick(overrides?: CityTickOptions): Promise<CityState>;
  getState(): Promise<CityState>;
  setState(next: CityState): Promise<void>;
}

interface CityStubOptions {
  name?: string;
  commandQueue?: Command[];
}

interface MarketStubOptions {
  orders?: OrdersState;
}

export interface KingdomTestHarness {
  id: string;
  instance: KingdomDO;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  getState(): Promise<KingdomState>;
  setState(next: KingdomState): Promise<void>;
}

export interface MarketTestHarness {
  id: string;
  instance: MarketDO;
  init(resourceCode: string): Promise<void>;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  getOrderbook(): Promise<OrdersState>;
  placeOrder(order: MarketOrderInput): Promise<{ matches?: any[] }>;
  match(): Promise<any[]>;
}

export interface MarketOrderInput {
  orderId: string;
  cityId: string;
  side: 'buy' | 'sell';
  price: number;
  qty: number;
  createdAt?: number;
}

export interface TestEnvExtensions {
  TEST_CLOCK: TestClock;
  TEST_RNG: TestRNG;
}

export class TestClock {
  private current: number;

  constructor(start = Date.UTC(2024, 0, 1)) {
    this.current = start;
  }

  now(): number {
    return this.current;
  }

  advance(ms: number): number {
    this.current += ms;
    return this.current;
  }
}

export class TestRNG {
  private seed: number;

  constructor(seed = 1) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) {
      this.seed += 2147483646;
    }
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

export function createCityState(overrides: Partial<CityState> = {}): CityState {
  const base: CityState = {
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
      build: [],
      train: [],
    },
    version: 1,
    seed: 1,
  };

  return {
    ...base,
    ...overrides,
    resources: {
      ...base.resources,
      ...(overrides.resources ?? {}),
    },
    labor: {
      ...base.labor,
      ...(overrides.labor ?? {}),
      assigned: {
        ...base.labor.assigned,
        ...(overrides.labor?.assigned ?? {}),
      },
    },
    laws: {
      ...base.laws,
      ...(overrides.laws ?? {}),
    },
    queues: {
      ...base.queues,
      ...(overrides.queues ?? {}),
      build: overrides.queues?.build ?? base.queues.build,
      train: overrides.queues?.train ?? base.queues.train,
    },
  };
}

export async function createTestRuntime(): Promise<TestRuntime> {
  const mf = new Miniflare({
    modules: true,
    script: 'export default { async fetch() { return new Response("ok"); } }',
    compatibilityDate: '2024-01-01',
    d1Databases: ['DB'],
  });

  const db = await mf.getD1Database('DB');
  await applyMigrationsAndSeed(db);

  const clock = new TestClock();
  const rng = new TestRNG();

  const env: Env & TestEnvExtensions = {
    DB: db,
    MARKET: createNamespaceStub(),
    REALM: createNamespaceStub(),
    KINGDOM: createNamespaceStub(),
    CITY: createNamespaceStub(),
    TEST_CLOCK: clock,
    TEST_RNG: rng,
  };

  return {
    clock,
    rng,
    env,
    db,
    async newCityStub(initialState?: CityState, options?: CityStubOptions): Promise<CityTestHarness> {
      const storage = new TestDurableObjectStorage();
      const state = new TestDurableObjectState(options?.name ?? randomUUID(), storage);

      if (initialState) {
        await state.storage.put('state', clone(initialState));
      }

      if (options?.commandQueue) {
        await state.storage.put('commandQueue', clone(options.commandQueue));
      }

      const instance = new CityDO(state, env);
      return {
        id: state.id.toString(),
        instance,
        fetch: async (path: string, init?: RequestInit) => {
          const request = new Request(`https://test${path}`, init);
          return instance.fetch(request);
        },
        processTick: async (overrides?: CityTickOverride) => {
          return instance.processTickForTest(overrides);
        },
        getState: async () => {
          const current = await state.storage.get<CityState>('state');
          if (!current) {
            throw new Error('City state not initialized');
          }
          return clone(current);
        },
        setState: async (next: CityState) => {
          await state.storage.put('state', clone(next));
        },
      };
    },
    async newKingdomStub(initialState?: KingdomState): Promise<KingdomTestHarness> {
      const storage = new TestDurableObjectStorage();
      const state = new TestDurableObjectState(randomUUID(), storage);
      if (initialState) {
        await state.storage.put('state', clone(initialState));
      }
      const instance = new KingdomDO(state, env);
      return {
        id: state.id.toString(),
        instance,
        fetch: (path, init) => {
          const request = new Request(`https://kingdom${path}`, init);
          return instance.fetch(request);
        },
        getState: async () => {
          const snapshot = await state.storage.get<KingdomState>('state');
          if (!snapshot) {
            throw new Error('Kingdom state not initialized');
          }
          return clone(snapshot);
        },
        setState: async (next: KingdomState) => {
          await state.storage.put('state', clone(next));
        },
      };
    },
    async newMarketStub(resourceCode: string, options?: MarketStubOptions): Promise<MarketTestHarness> {
      const storage = new TestDurableObjectStorage();
      const state = new TestDurableObjectState(`market-${resourceCode}-${randomUUID()}`, storage);
      const instance = new MarketDO(state, env);
      await instance.fetch(new Request('https://market/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceCode }),
      }));

      if (options?.orders) {
        await state.storage.put('orders', clone(options.orders));
      }

      return {
        id: state.id.toString(),
        instance,
        init: async (code: string) => {
          await instance.fetch(new Request('https://market/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceCode: code }),
          }));
        },
        fetch: (path, init) => {
          const request = new Request(`https://market${path}`, init);
          return instance.fetch(request);
        },
        getOrderbook: async () => {
          const response = await instance.fetch(new Request('https://market/book'));
          const data = await response.json<OrdersState>();
          return data;
        },
        placeOrder: async (order: MarketOrderInput) => {
          const response = await instance.fetch(new Request('https://market/add-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order),
          }));
          return response.json<{ matches?: any[] }>();
        },
        match: async () => {
          const response = await instance.fetch(new Request('https://market/match', { method: 'POST' }));
          const data = await response.json<{ matches: any[] }>();
          return data.matches || [];
        },
      };
    },
    async dispose() {
      await mf.dispose();
    },
  };
}

async function applyMigrationsAndSeed(db: D1Database): Promise<void> {
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    await runSqlFile(db, path.join(migrationsDir, file));
  }

  await runSqlFile(db, path.join(scriptsDir, 'seed-kingdom-ledger.sql'));
}

class TestDurableObjectState implements DurableObjectState {
  public storage: DurableObjectStorage;
  public id: DurableObjectId;

  constructor(name: string, storage: TestDurableObjectStorage) {
    this.storage = storage;
    this.id = new TestDurableObjectId(name);
  }

  blockConcurrencyWhile<T>(closure: () => Promise<T>): Promise<T> {
    return closure();
  }

  waitUntil(_promise: Promise<any>): void {
    // No-op in tests
  }

  getTag(): string {
    return 'test';
  }

  setTag(): void {
    // No-op
  }
}

class TestDurableObjectStorage implements DurableObjectStorage {
  private map = new Map<string, any>();

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const value = this.map.get(key);
    return value === undefined ? undefined : clone(value);
  }

  async put<T = unknown>(key: string, value: T): Promise<void> {
    this.map.set(key, clone(value));
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key);
  }

  async list<T = unknown>(): Promise<Map<string, T>> {
    return new Map(this.map as Map<string, T>);
  }

  async deleteAll(): Promise<void> {
    this.map.clear();
  }
}

class TestDurableObjectId implements DurableObjectId {
  constructor(private readonly name: string) {}

  toString(): string {
    return this.name;
  }
}

function createNamespaceStub(): DurableObjectNamespace {
  return {
    idFromName(name: string): DurableObjectId {
      return new TestDurableObjectId(name);
    },
    idFromString(id: string): DurableObjectId {
      return new TestDurableObjectId(id);
    },
    idFromBytes(bytes: ArrayBuffer): DurableObjectId {
      return new TestDurableObjectId(Buffer.from(bytes).toString('hex'));
    },
    get(id: DurableObjectId): DurableObjectStub {
      return {
        id,
        fetch: async () => {
          throw new Error('DurableObjectStub.fetch is not implemented in tests');
        },
      } as DurableObjectStub;
    },
  };
}

async function runSqlFile(db: D1Database, filePath: string): Promise<void> {
  const raw = await fs.readFile(filePath, 'utf8');
  const withoutComments = raw
    .split(/\r?\n/)
    .map(line => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('--')) {
        return '';
      }
      const commentIndex = line.indexOf('--');
      return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    })
    .join('\n');

  const statements = withoutComments
    .split(/;\s*(?:\r?\n|$)/)
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

function clone<T>(value: T): T {
  const globalClone = (globalThis as any).structuredClone;
  if (typeof globalClone === 'function') {
    return globalClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

