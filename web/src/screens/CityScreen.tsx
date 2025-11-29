
import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import { usePolling } from '../hooks/usePolling';
import type { ClientOverview } from '../services/types';

export function CityScreen() {
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      const data = await api.getOverview();
      setOverview(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  usePolling(fetchOverview, 15000);

  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!overview) return <div>Loading city...</div>;

  const { city } = overview;

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <section style={{ border: '1px solid #ddd', padding: '1rem' }}>
        <h2>{city.name} (Lvl {city.level})</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {Object.entries(city.resources).map(([res, amt]) => (
            <div key={res} style={{ padding: '0.5rem', background: '#f0f0f0' }}>
              <strong>{res}:</strong> {Math.floor(amt)}
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
          <h3>Buildings</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {city.buildings.map((b, i) => (
              <li key={i} style={{ margin: '0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                <span>{b.type} (Lvl {b.level})</span>
                <button disabled>Upgrade (Soon)</button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ border: '1px solid #ddd', padding: '1rem' }}>
          <h3>Army & Troops</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {city.troops.map((t, i) => (
              <li key={i} style={{ margin: '0.5rem 0' }}>
                {t.type}: {t.count}
              </li>
            ))}
          </ul>
          <button onClick={() => alert('Training dialog would go here')}>Train Troops</button>
        </div>
      </section>
    </div>
  );
}

