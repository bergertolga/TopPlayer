
import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import type { ClientOverview } from '../services/types';
import { GameCard } from '../components/ui/GameCard';
import { ResourceDisplay } from '../components/ui/ResourceDisplay';
import { LoadingScreen } from '../components/ui/LoadingScreen';

export function ProfileScreen() {
  const [overview, setOverview] = useState<ClientOverview | null>(null);

  useEffect(() => {
    api.getOverview().then(setOverview);
  }, []);

  if (!overview) return <LoadingScreen message="Loading Profile..." />;

  const { premium } = overview;

  return (
    <div className="flex-col gap-lg">
      <h1 style={{ color: 'var(--color-gold)' }}>Profile & Premium</h1>
      
      <div className="flex gap-md">
        <GameCard title="Wallet" className="flex gap-lg items-center" style={{ minWidth: '300px' }}>
          <ResourceDisplay 
            icon="/assets/layerlab/resources/crowns.png" 
            label="Crowns" 
            amount={premium.wallet.crowns} 
          />
          <ResourceDisplay 
            icon="/assets/layerlab/resources/gems.png" 
            label="Gems" 
            amount={premium.wallet.gems} 
          />
          <ResourceDisplay 
            icon="/assets/layerlab/resources/favor.png" 
            label="Favor" 
            amount={premium.wallet.favor} 
          />
        </GameCard>
      </div>

      <GameCard title="Inventory / Cosmetics" className="flex-col gap-md">
        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          {premium.ownedCosmetics.map(c => (
              <div key={c.code} style={{ 
                border: '1px solid var(--color-gold-dim)', 
                padding: '1rem', 
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                minWidth: '150px',
                textAlign: 'center'
              }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-text-highlight)' }}>{c.code}</div>
                  <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{c.type}</div>
              </div>
          ))}
          {premium.ownedCosmetics.length === 0 && <p style={{ opacity: 0.5 }}>No items owned.</p>}
        </div>
      </GameCard>
    </div>
  );
}
