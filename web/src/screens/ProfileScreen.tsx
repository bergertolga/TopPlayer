
import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import type { ClientOverview } from '../services/types';

export function ProfileScreen() {
  const [overview, setOverview] = useState<ClientOverview | null>(null);

  useEffect(() => {
    api.getOverview().then(setOverview);
  }, []);

  if (!overview) return <div>Loading...</div>;

  const { premium } = overview;

  return (
    <div>
      <h2>Profile & Premium</h2>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div>Crowns: {premium.wallet.crowns}</div>
        <div>Gems: {premium.wallet.gems}</div>
        <div>Favor: {premium.wallet.favor}</div>
      </div>

      <h3>Inventory / Cosmetics</h3>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {premium.ownedCosmetics.map(c => (
            <div key={c.code} style={{ border: '1px solid gold', padding: '1rem' }}>
                {c.code} ({c.type})
            </div>
        ))}
        {premium.ownedCosmetics.length === 0 && <p>No items owned.</p>}
      </div>
    </div>
  );
}

