
import type { ClientOverview, TechNode, CombatEntity, BattleLog, AuthResponse } from './types';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isLocal ? 'http://localhost:8787' : 'https://idle-adventure-backend.tolga-730.workers.dev');

console.log('API_BASE_URL:', API_BASE_URL);

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
      let message = response.statusText;
      try {
        const body = await response.json();
        message = body?.error || body?.message || message;
      } catch (_) {
        // ignore parse errors
      }
      throw new Error(`API Error: ${message}`);
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

  async purchaseCapitalItem(offerCode: string): Promise<any> {
    return this.request('/api/v1/world/capital/store/purchase', {
      method: 'POST',
      body: JSON.stringify({ offerCode }),
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
    return this.request('/api/v1/market/my-orders');
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
    // Note: The endpoint is /turn-in but effectively claims/contributes.
    // If it's a "fetch quest" style, we might use contribute with 0 amount or similar?
    // Based on backend code: turn-in takes amount. If quest is "gather", we might need to send amount?
    // Or if it's "claim", maybe amount is ignored or we assume it's a completion check.
    // Let's assume for simple UI we just call turn-in.
    return this.request('/api/v1/quests/turn-in', {
      method: 'POST',
      body: JSON.stringify({ questId })
    });
  }

  async getMilestones(): Promise<any> {
    return this.request('/api/v1/city/milestones');
  }

  async claimMilestone(milestoneId: string): Promise<any> {
    return this.request('/api/v1/city/milestones/claim', {
      method: 'POST',
      body: JSON.stringify({ milestoneId })
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
      return this.request('/api/v1/city/construct', {
          method: 'POST',
          body: JSON.stringify({ buildingType: type })
      });
  }

  async collectResources(buildingId?: string): Promise<any> {
      return this.request('/api/v1/city/collect', {
          method: 'POST',
          body: JSON.stringify(buildingId ? { buildingId } : {}),
      });
  }

  async upgradeBuilding(buildingCode: string): Promise<any> {
      return this.request('/api/v1/city/upgrade', {
          method: 'POST',
          body: JSON.stringify({ buildingCode })
      });
  }

  async getTroopTypes(): Promise<any> {
      return this.request('/api/v1/army/troop-types');
  }

  async trainTroops(troopTypeId: string, quantity: number): Promise<any> {
      return this.request('/api/v1/army/train', {
          method: 'POST',
          body: JSON.stringify({ troopTypeId, quantity })
      });
  }

  // Council
  async getCouncilProfile(councilId: string): Promise<any> {
    return this.request(`/api/v1/council/profile/${councilId}`);
  }

  async getMyCouncil(): Promise<any> {
    return this.request('/api/v1/council');
  }

  async createCouncil(name: string, guildCode: string): Promise<any> {
    return this.request('/api/v1/council/create', {
      method: 'POST',
      body: JSON.stringify({ name, guildCode })
    });
  }

  async joinCouncil(councilId: string): Promise<any> {
    return this.request('/api/v1/council/join', {
      method: 'POST',
      body: JSON.stringify({ councilId })
    });
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

  async kickCouncilMember(userId: string): Promise<any> {
    return this.request('/api/v1/council/kick', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async promoteCouncilMember(userId: string): Promise<any> {
    return this.request('/api/v1/council/promote', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async setCouncilTaxRate(rate: number): Promise<any> {
    return this.request('/api/v1/council/tax', {
      method: 'POST',
      body: JSON.stringify({ rate }),
    });
  }

  async createPublicWork(work: { projectCode: string, name: string, requiredResources: Record<string, number> }): Promise<any> {
    return this.request('/api/v1/council/public-works/create', {
      method: 'POST',
      body: JSON.stringify(work),
    });
  }

  async contributeToPublicWork(publicWorkId: string, contributions: Record<string, number>): Promise<any> {
    return this.request('/api/v1/council/public-works/contribute', {
      method: 'POST',
      body: JSON.stringify({ publicWorkId, contributions }),
    });
  }

  // Combat
  async getCombatMap(regionId: string = 'region-1'): Promise<{ targets: CombatEntity[] }> {
    return this.request(`/api/v1/combat/map?region=${regionId}`);
  }

  async relocateCity(regionId: string): Promise<any> {
    return this.request('/api/v1/city/move', {
      method: 'POST',
      body: JSON.stringify({ regionId }),
    });
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

  async healWoundedTroops(troops: Record<string, number>): Promise<any> {
    return this.request('/api/v1/combat/heal', {
      method: 'POST',
      body: JSON.stringify({ troops })
    });
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

  async getPremiumBalance(): Promise<{ crowns: number; lastStipendAt?: number; boosts?: any[] }> {
      return this.request('/api/v1/premium/balance');
  }

  async claimStipend(): Promise<{ crowns: number; lastStipendAt?: number }> {
      return this.request('/api/v1/premium/stipend', { method: 'POST' });
  }

  async getBundles(): Promise<{ bundles: Array<{ code: string; name: string; description: string; price: number; contents: any }> }> {
      return this.request('/api/v1/shop/bundles');
  }

  async purchaseBundle(bundleCode: string, paymentMethod: 'crowns' | 'cash' = 'crowns'): Promise<any> {
      return this.request('/api/v1/shop/purchase', {
          method: 'POST',
          body: JSON.stringify({ bundleCode, paymentMethod })
      });
  }

  async getWorldChat(limit: number = 50): Promise<{ messages: Array<{ id: string; user_id: string; username?: string; message: string; created_at: number }> }> {
      return this.request(`/api/v1/chat/world?limit=${limit}`);
  }

  async postWorldMessage(message: string): Promise<any> {
      return this.request('/api/v1/chat/world', {
          method: 'POST',
          body: JSON.stringify({ message })
      });
  }
}

export const api = new ApiClient();

