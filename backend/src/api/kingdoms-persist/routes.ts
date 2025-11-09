/**
 * Kingdoms Persist API Routes
 * Implements the public API as specified in the design doc
 */

import { Env } from '../../types';
import { Command, CommandResponse, CityStateResponse, RealmTimeResponse, OrderBookResponse, OrderPlaceCommand } from '../../types/kingdoms-persist';

export async function handleKingdomsPersistAPI(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Realm endpoints
    if (path === '/realm/time') {
      return handleRealmTime(env, corsHeaders);
    }

    // Kingdom endpoints
    if (path.startsWith('/kingdom/')) {
      const kingdomId = path.split('/')[2];
      const subPath = path.substring(`/kingdom/${kingdomId}`.length);
      
      if (subPath === '/market/orderbook') {
        return handleMarketOrderBook(request, env, kingdomId, corsHeaders);
      } else if (subPath === '/market/order') {
        return handleMarketOrder(request, env, kingdomId, corsHeaders);
      }
    }

    // City endpoints
    if (path.startsWith('/city/')) {
      const cityId = path.split('/')[2];
      const subPath = path.substring(`/city/${cityId}`.length);

      if (subPath === '/state') {
        return handleCityState(request, env, cityId, corsHeaders);
      } else if (subPath === '/command') {
        return handleCityCommand(request, env, cityId, corsHeaders);
      }
    }

    // WebSocket endpoint
    if (path === '/ws') {
      return handleWebSocket(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      500,
      corsHeaders
    );
  }
}

async function handleRealmTime(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  const realmDO = env.REALM.get(env.REALM.idFromName('realm-1'));
  const response = await realmDO.fetch(new Request('https://internal/time'));
  const data = await response.json<RealmTimeResponse>();
  return jsonResponse(data, 200, corsHeaders);
}

async function handleCityState(
  request: Request,
  env: Env,
  cityId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const cityDO = env.CITY.get(env.CITY.idFromName(cityId));
  const response = await cityDO.fetch(new Request('https://internal/state'));
  const data = await response.json<CityStateResponse>();
  return jsonResponse(data, 200, corsHeaders);
}

async function handleCityCommand(
  request: Request,
  env: Env,
  cityId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const command: Command = await request.json();
  command.client_time = command.client_time || Date.now();

  const cityDO = env.CITY.get(env.CITY.idFromName(cityId));
  const response = await cityDO.fetch(
    new Request('https://internal/command', {
      method: 'POST',
      body: JSON.stringify(command),
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const data = await response.json<CommandResponse>();
  return jsonResponse(data, 200, corsHeaders);
}

async function handleMarketOrderBook(
  request: Request,
  env: Env,
  kingdomId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const item = url.searchParams.get('item');
  
  if (!item) {
    return jsonResponse({ error: 'item parameter required' }, 400, corsHeaders);
  }

  const realmDO = env.REALM.get(env.REALM.idFromName('realm-1'));
  const response = await realmDO.fetch(
    new Request(`https://internal/market/orderbook?item=${item}`)
  );
  const data = await response.json<OrderBookResponse>();
  return jsonResponse(data, 200, corsHeaders);
}

async function handleMarketOrder(
  request: Request,
  env: Env,
  kingdomId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const body = await request.json() as { city_id: string; side: 'buy' | 'sell'; item: string; qty: number; price: number };
  const { city_id, side, item, qty, price } = body;

  // Create order command and route to city
  const command: OrderPlaceCommand = {
    type: 'ORDER_PLACE',
    side,
    item,
    qty,
    price,
    client_time: Date.now(),
  };

  const cityDO = env.CITY.get(env.CITY.idFromName(city_id));
  const response = await cityDO.fetch(
    new Request('https://internal/command', {
      method: 'POST',
      body: JSON.stringify(command),
      headers: { 'Content-Type': 'application/json' },
    })
  );

  const data = await response.json<CommandResponse>();
  return jsonResponse(data, 200, corsHeaders);
}

async function handleWebSocket(request: Request, env: Env): Promise<Response> {
  // WebSocket implementation would go here
  // For now, return 501 Not Implemented
  return new Response('WebSocket not yet implemented', { status: 501 });
}

function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

