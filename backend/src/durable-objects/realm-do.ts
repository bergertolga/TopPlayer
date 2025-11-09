/**
 * RealmDO - Per-realm singleton Durable Object
 * Manages global clock, events, and market matching
 */

import { RealmState, MarketOrder, Trade, OrderBook } from '../types/kingdoms-persist';

export class RealmDO {
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
    let realmState = await this.state.storage.get<RealmState>('state');
    if (!realmState) {
      realmState = {
        tick: 0,
        iso_time: new Date().toISOString(),
        ruleset_id: 'v1',
        kingdoms: [],
      };
      await this.state.storage.put('state', realmState);
    }

    if (path === '/time') {
      return this.getTime();
    } else if (path === '/tick') {
      return this.incrementTick();
    } else if (path.startsWith('/market/')) {
      return this.handleMarket(request, path);
    } else if (path.startsWith('/events')) {
      return this.handleEvents(request, path);
    }

    return new Response('Not found', { status: 404 });
  }

  private async getTime(): Promise<Response> {
    const state = await this.state.storage.get<RealmState>('state');
    if (!state) {
      return Response.json({ error: 'State not initialized' }, { status: 500 });
    }
    return Response.json({
      tick: state.tick,
      iso_time: state.iso_time,
    });
  }

  private async incrementTick(): Promise<Response> {
    const state = await this.state.storage.get<RealmState>('state');
    if (!state) {
      return Response.json({ error: 'State not initialized' }, { status: 500 });
    }
    state.tick += 1;
    state.iso_time = new Date().toISOString();
    await this.state.storage.put('state', state);
    return Response.json({ tick: state.tick });
  }

  private async handleMarket(request: Request, path: string): Promise<Response> {
    if (path === '/market/orderbook') {
      return this.getOrderBook(request);
    } else if (path === '/market/match') {
      return this.matchOrders(request);
    }
    return new Response('Not found', { status: 404 });
  }

  private async getOrderBook(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const item = url.searchParams.get('item');
    if (!item) {
      return Response.json({ error: 'item parameter required' }, { status: 400 });
    }

    const orders = (await this.state.storage.get<MarketOrder[]>(`orders:${item}`)) || [];
    const openOrders = orders.filter(o => o.status === 'open');

    const bids = openOrders
      .filter(o => o.side === 'buy')
      .sort((a, b) => b.price - a.price || a.created_at - b.created_at)
      .map(o => ({ price: o.price, qty: o.qty - (o.filled_qty || 0) }));

    const asks = openOrders
      .filter(o => o.side === 'sell')
      .sort((a, b) => a.price - b.price || a.created_at - b.created_at)
      .map(o => ({ price: o.price, qty: o.qty - (o.filled_qty || 0) }));

    return Response.json({ bids, asks });
  }

  private async matchOrders(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const item = url.searchParams.get('item');
    if (!item) {
      return Response.json({ error: 'item parameter required' }, { status: 400 });
    }

    const orders = (await this.state.storage.get<MarketOrder[]>(`orders:${item}`)) || [];
    const openOrders = orders.filter(o => o.status === 'open');

    const bids = openOrders.filter(o => o.side === 'buy').sort((a, b) => b.price - a.price || a.created_at - b.created_at);
    const asks = openOrders.filter(o => o.side === 'sell').sort((a, b) => a.price - b.price || a.created_at - b.created_at);

    const trades: Trade[] = [];

    for (const bid of bids) {
      for (const ask of asks) {
        if (bid.price >= ask.price && bid.city_id !== ask.city_id) {
          // Match found - price-time priority
          const bidRemaining = bid.qty - (bid.filled_qty || 0);
          const askRemaining = ask.qty - (ask.filled_qty || 0);
          const tradeQty = Math.min(bidRemaining, askRemaining);

          if (tradeQty > 0) {
            const tradePrice = ask.price; // Price-time priority: use ask price

            trades.push({
              id: crypto.randomUUID(),
              order_buy: bid.id,
              order_sell: ask.id,
              item,
              qty: tradeQty,
              price: tradePrice,
              ts: Date.now(),
            });

            bid.filled_qty = (bid.filled_qty || 0) + tradeQty;
            ask.filled_qty = (ask.filled_qty || 0) + tradeQty;

            if (bid.filled_qty >= bid.qty) {
              bid.status = 'filled';
            }
            if (ask.filled_qty >= ask.qty) {
              ask.status = 'filled';
            }
          }
        }
      }
    }

    // Save updated orders
    await this.state.storage.put(`orders:${item}`, orders);

    // Save trades
    const existingTrades = (await this.state.storage.get<Trade[]>(`trades:${item}`)) || [];
    await this.state.storage.put(`trades:${item}`, [...existingTrades, ...trades]);

    return Response.json({ trades, matched: trades.length });
  }

  private async handleEvents(request: Request, path: string): Promise<Response> {
    if (path === '/events') {
      return this.getEvents(request);
    }
    return new Response('Not found', { status: 404 });
  }

  private async getEvents(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const kingdomId = url.searchParams.get('kingdom_id');
    const since = parseInt(url.searchParams.get('since') || '0');

    // In real implementation, fetch from D1 or storage
    return Response.json({ events: [] });
  }
}

