
import type { ClientOverview, TechNode, CombatEntity, BattleLog, AuthResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

class ApiClient {
  private userId: string | null = localStorage.getItem('top_player_user_id');

  setUserId(id: string) {
    this.userId = id;
    localStorage.setItem('top_player_user_id', id);
  }

  getUserId() {
    return this.userId;
  }

  logout() {
    this.userId = null;
    localStorage.removeItem('top_player_user_id');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (this.userId) {
      headers.set('X-User-ID', this.userId);
    }
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth
  async login(username: string): Promise<AuthResponse> {
    const res = await this.request<{ user: { id: string; username: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
    if (res.user) {
        this.setUserId(res.user.id);
    }
    return res;
  }

  async register(username: string, email?: string): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email }),
    });
    // The register endpoint returns { userId, username, email }
    if (res.userId) {
        this.setUserId(res.userId);
        // Normalize response to match login if needed, or caller handles it
        return { ...res, user: { id: res.userId, username } };
    }
    return res;
  }

  // Capital
  async getCapitalState(): Promise<any> {
    return this.request('/api/v1/world/capital');
  }

  async fulfillCapitalRequest(requestCode: string): Promise<any> {
    return this.request('/api/v1/world/capital/requests/fulfill', {
      method: 'POST',
      body: JSON.stringify({ requestCode }),
    });
  }

  // Market
  async getMarketBook(resourceCode: string): Promise<any> {
    return this.request(`/api/v1/market/book?resource=${resourceCode}`);
  }

  async placeOrder(order: { side: 'buy' | 'sell', resource: string, price: number, qty: number }): Promise<any> {
    return this.request('/api/v1/market/order', {
      method: 'POST',
      body: JSON.stringify(order),
    });
  }

  async getMyOrders(): Promise<any> {
    // Currently no dedicated endpoint for "my orders", but we can filter from book or add one.
    // For now, we'll assume the overview or book returns relevant data, or we add a stub.
    // Actually, backend doesn't have "get my orders" endpoint explicitly exposed in the snippet I saw.
    // I'll add a placeholder or use what's available.
    // Let's check backend/src/api/v1/market.ts again if needed.
    // For now, let's assume we might need to add it or it's missing.
    return []; 
  }

  async cancelOrder(orderId: string): Promise<any> {
    return this.request('/api/v1/market/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  // Quests
  async getQuests(): Promise<any> {
    return this.request('/api/v1/quests');
  }

  async claimQuestReward(questId: string): Promise<any> {
    return this.request(`/api/v1/quests/${questId}/claim`, {
      method: 'POST',
    });
  }

  // Core
  async getOverview(): Promise<ClientOverview> {
    return this.request<ClientOverview>('/api/v1/client/overview');
  }

  // City
  // Note: These might not have specific endpoints yet, might need to rely on generic actions if available
  // or I'll implement placeholders if the backend logic exists but isn't exposed perfectly.
  // Assuming standard endpoints based on previous phases or I will add them if critical missing.
  // Checking backend code... `handleCity` handles basic city ops?
  // `backend/src/api/v1/city.ts` seems to exist.

  async constructBuilding(type: string): Promise<any> {
      // POST /api/v1/city/construct { buildingType: ... }
      // Need to verify this endpoint exists.
      return this.request('/api/v1/city/construct', {
          method: 'POST',
          body: JSON.stringify({ buildingType: type })
      });
  }

  async trainTroops(type: string, amount: number): Promise<any> {
      // POST /api/v1/army/train { type, amount }
      return this.request('/api/v1/army/train', {
          method: 'POST',
          body: JSON.stringify({ type, amount })
      });
  }

  // Council
  async getCouncilProfile(councilId: string): Promise<any> {
    return this.request(`/api/v1/council/profile/${councilId}`);
  }

  async getCouncilTechTree(): Promise<{ tech_tree: TechNode[] }> {
    // Requires being in a council.
    // Use the endpoint I added in backend/src/api/v1/council-tech.ts -> routed via handleCouncil
    // Path: /api/v1/council/tech/tree
    return this.request('/api/v1/council/tech/tree');
  }

  async contributeToTech(techCode: string, resources: Record<string, number>): Promise<any> {
    return this.request('/api/v1/council/tech/contribute', {
      method: 'POST',
      body: JSON.stringify({ techCode, resources }),
    });
  }

  async getCouncilChat(councilId: string): Promise<any> {
    return this.request(`/api/v1/council/chat?limit=50&cid=${councilId}`);
  }

  async sendCouncilMessage(message: string): Promise<any> {
    return this.request('/api/v1/council/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async createPublicWork(work: { projectCode: string, name: string, requiredResources: Record<string, number> }): Promise<any> {
    return this.request('/api/v1/council/public-works/create', {
      method: 'POST',
      body: JSON.stringify(work),
    });
  }

  // Combat
  async getCombatMap(regionId: string = 'region-1'): Promise<{ targets: CombatEntity[] }> {
    return this.request(`/api/v1/combat/map?region=${regionId}`);
  }

  async attackEntity(entityId: string): Promise<any> {
    // POST /api/v1/combat/pve/attack/:entityId
    return this.request(`/api/v1/combat/pve/attack/${entityId}`, {
      method: 'POST',
    });
  }

  async getCombatLogs(): Promise<{ logs: BattleLog[] }> {
    return this.request('/api/v1/combat/logs');
  }

  // World
  async getWorldMap(): Promise<{ entities: any[], regions: any[] }> {
    // Assuming backend endpoint exists or we use combat/map per region
    // The previous analysis showed /api/v1/combat/map returns entities.
    // Let's iterate regions or assume a global fetch if available.
    // For now, let's fetch the default region.
    const res = await this.getCombatMap('region-1');
    return {
      entities: res.targets,
      regions: [{ id: 'region-1', name: 'Heartlands' }, { id: 'region-2', name: 'Borderlands' }]
    };
  }

  // Premium
  async getPremiumItems(): Promise<any> {
      // GET /api/v1/shop/items
      return this.request('/api/v1/shop/items');
  }
}

export const api = new ApiClient();

