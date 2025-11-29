
import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';

export function MapScreen() {
  const [entities, setEntities] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('region-1');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMap = async () => {
      setLoading(true);
      try {
        const data = await api.getCombatMap(selectedRegion);
        setEntities(data.targets);
        // Mock regions for now as API doesn't list them all yet
        setRegions([{ id: 'region-1', name: 'Heartlands' }, { id: 'region-2', name: 'Borderlands' }]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
  }, [selectedRegion]);

  const handleAttack = async (id: string) => {
    try {
      await api.attackEntity(id);
      alert('Attack sent! Check Combat Logs.');
    } catch (e: any) {
      alert(e.message || 'Attack failed');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h1>World Map</h1>
        <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} style={{ padding: '0.5rem' }}>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {loading ? <p>Loading Map...</p> : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
          gap: '1rem', 
          background: '#e0f7fa', 
          padding: '2rem', 
          minHeight: '500px',
          borderRadius: '8px'
        }}>
          {entities.map((entity: any) => (
            <div key={entity.id} style={{ 
              background: 'white', 
              padding: '1rem', 
              borderRadius: '8px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                {entity.type === 'BANDIT_CAMP' ? '⛺️' : '🏛️'}
              </div>
              <strong>{entity.type.replace('_', ' ')}</strong>
              <p>Level {entity.level}</p>
              <button 
                onClick={() => handleAttack(entity.id)}
                style={{ background: '#f44336', color: 'white', border: 'none', padding: '0.5rem', marginTop: '0.5rem', width: '100%' }}
              >
                Attack
              </button>
            </div>
          ))}
          {entities.length === 0 && <p>No targets found in this region.</p>}
        </div>
      )}
    </div>
  );
}

