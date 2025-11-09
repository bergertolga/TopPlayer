interface Order {
  id: string;
  cityId: string;
  price: number;
  qty: number;
  qtyFilled: number;
  createdAt: number;
}

interface OrdersState {
  buys: Order[];
  sells: Order[];
}

export class MarketDO {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async getOrders(): Promise<OrdersState> {
    const stored = await this.state.storage.get<OrdersState>('orders');
    if (stored) {
      return stored;
    }
    return await this.syncFromDatabase();
  }

  async syncFromDatabase(): Promise<OrdersState> {
    let resourceCode = await this.state.storage.get<string>('resourceCode');
    
    if (!resourceCode) {
      return { buys: [], sells: [] };
    }

    const resource = await this.env.DB.prepare(
      'SELECT id FROM resources WHERE code = ?'
    )
      .bind(resourceCode)
      .first() as { id: string } | null;

    if (!resource) {
      return { buys: [], sells: [] };
    }

    const dbOrders = await this.env.DB.prepare(
      `SELECT id, city_id, side, price, qty, qty_filled, created_at 
       FROM market_orders 
       WHERE resource_id = ? AND status = 'open'`
    )
      .bind(resource.id)
      .all() as { results: Array<{ id: string; city_id: string; side: string; price: number; qty: number; qty_filled: number; created_at: number }> };

    const orders: OrdersState = { buys: [], sells: [] };

    for (const order of dbOrders.results) {
      const orderObj: Order = {
        id: order.id,
        cityId: order.city_id,
        price: order.price,
        qty: order.qty,
        qtyFilled: order.qty_filled,
        createdAt: order.created_at,
      };

      if (order.side === 'buy') {
        orders.buys.push(orderObj);
      } else {
        orders.sells.push(orderObj);
      }
    }

    orders.buys.sort((a, b) => {
      if (b.price !== a.price) return b.price - a.price;
      return a.createdAt - b.createdAt;
    });
    orders.sells.sort((a, b) => {
      if (a.price !== b.price) return a.price - b.price;
      return a.createdAt - b.createdAt;
    });

    await this.saveOrders(orders);
    return orders;
  }

  async saveOrders(orders: OrdersState): Promise<void> {
    await this.state.storage.put('orders', orders);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST' && path === '/init') {
      const body = await request.json() as { resourceCode: string };
      await this.state.storage.put('resourceCode', body.resourceCode);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else if (request.method === 'POST' && path === '/match') {
      return this.handleMatch(request);
    } else if (request.method === 'GET' && path === '/book') {
      return this.handleGetBook();
    } else if (request.method === 'POST' && path === '/add-order') {
      return this.handleAddOrder(request);
    } else if (request.method === 'POST' && path === '/cancel-order') {
      return this.handleCancelOrder(request);
    }

    return new Response('Not found', { status: 404 });
  }

  async handleAddOrder(request: Request): Promise<Response> {
    const body = await request.json() as {
      orderId: string;
      cityId: string;
      side: 'buy' | 'sell';
      price: number;
      qty: number;
    };

    const orders = await this.getOrders();
    const order: Order = {
      id: body.orderId,
      cityId: body.cityId,
      price: body.price,
      qty: body.qty,
      qtyFilled: 0,
      createdAt: Date.now(),
    };

    if (body.side === 'buy') {
      const index = orders.buys.findIndex(o => o.price < body.price || (o.price === body.price && o.createdAt > order.createdAt));
      if (index === -1) {
        orders.buys.push(order);
      } else {
        orders.buys.splice(index, 0, order);
      }
    } else {
      const index = orders.sells.findIndex(o => o.price > body.price || (o.price === body.price && o.createdAt > order.createdAt));
      if (index === -1) {
        orders.sells.push(order);
      } else {
        orders.sells.splice(index, 0, order);
      }
    }

    await this.saveOrders(orders);

    const matches = await this.tryMatch();

    return new Response(JSON.stringify({ success: true, matches }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async handleCancelOrder(request: Request): Promise<Response> {
    const body = await request.json() as { orderId: string };

    const orders = await this.getOrders();
    orders.buys = orders.buys.filter(o => o.id !== body.orderId);
    orders.sells = orders.sells.filter(o => o.id !== body.orderId);
    await this.saveOrders(orders);

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async handleGetBook(): Promise<Response> {
    const orders = await this.getOrders();
    return new Response(JSON.stringify({
      buys: orders.buys.slice(0, 20),
      sells: orders.sells.slice(0, 20),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async handleMatch(request: Request): Promise<Response> {
    const matches = await this.tryMatch();
    return new Response(JSON.stringify({ matches }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async tryMatch(): Promise<any[]> {
    const orders = await this.getOrders();
    const matches: any[] = [];
    let changed = false;

    while (orders.buys.length > 0 && orders.sells.length > 0) {
      const buy = orders.buys[0];
      const sell = orders.sells[0];

      if (buy.price < sell.price) {
        break;
      }

      const tradePrice = sell.price;
      const tradeQty = Math.min(
        buy.qty - buy.qtyFilled,
        sell.qty - sell.qtyFilled
      );

      matches.push({
        buyOrderId: buy.id,
        sellOrderId: sell.id,
        cityIdBuyer: buy.cityId,
        cityIdSeller: sell.cityId,
        price: tradePrice,
        qty: tradeQty,
      });

      buy.qtyFilled += tradeQty;
      sell.qtyFilled += tradeQty;
      changed = true;

      if (buy.qtyFilled >= buy.qty) {
        orders.buys.shift();
      }
      if (sell.qtyFilled >= sell.qty) {
        orders.sells.shift();
      }
    }

    if (changed) {
      await this.saveOrders(orders);
    }

    return matches;
  }
}


