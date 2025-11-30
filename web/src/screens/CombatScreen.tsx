import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';
import type { BattleLog, ClientOverview } from '../services/types';
import { useToast } from '../components/Toast';

export function CombatScreen() {
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [logs, setLogs] = useState<BattleLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const { showToast } = useToast();
  
  // Hospital State: map typeId -> amount
  const [healAmounts, setHealAmounts] = useState<Record<string, number>>({});

  const fetchData = async () => {
    try {
      const [ov, lg] = await Promise.all([
        api.getOverview(),
        api.getCombatLogs()
      ]);
      setOverview(ov);
      setLogs(lg.logs);
      
      // Reset heal amounts
      const initialHeal: Record<string, number> = {};
      ov.city.hospital.woundedByType.forEach((w: any) => {
        if (w.typeId) {
          initialHeal[w.typeId] = 0;
        }
      });
      setHealAmounts(initialHeal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showLogDetails = (log: BattleLog) => {
    try {
      const details = JSON.parse(log.details_json);
      setSelectedLog({ ...log, details });
    } catch (e) {
      showToast('Failed to parse log details', 'error');
    }
  };

  const handleHeal = async () => {
    const toHeal: Record<string, number> = {};
    let total = 0;
    
    Object.entries(healAmounts).forEach(([typeId, amount]) => {
      if (amount > 0) {
        toHeal[typeId] = amount;
        total += amount;
      }
    });

    if (total === 0) {
      showToast('Select troops to heal', 'info');
      return;
    }

    try {
      await api.healWoundedTroops(toHeal);
      showToast('Healing started!', 'success');
      fetchData();
    } catch (e: any) {
      showToast(e.message || 'Healing failed', 'error');
    }
  };

  const updateHealAmount = (typeId: string, val: number) => {
    setHealAmounts(prev => ({ ...prev, [typeId]: val }));
  };

  if (loading) return <div>Loading Combat Data...</div>;
  if (!overview) return <div>Failed to load data</div>;

  return (
    <div style={{ padding: '1rem', display: 'flex', gap: '2rem' }}>
      <div style={{ flex: 1 }}>
        <h1>Army & Hospital</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <h2>Active Troops</h2>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {overview.city.troops.map((t, i) => (
              <div key={i} style={{ border: '1px solid #ddd', padding: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                <strong>{t.type}</strong>
                <span>{t.count}</span>
              </div>
            ))}
            {overview.city.troops.length === 0 && <p>No troops trained.</p>}
          </div>
        </div>

        <div>
          <h2>Hospital ({overview.city.hospital.occupied}/{overview.city.hospital.capacity})</h2>
          {overview.city.hospital.woundedByType.length > 0 ? (
             <div style={{ display: 'grid', gap: '1rem', border: '1px solid #ffcdd2', padding: '1rem', background: '#ffebee' }}>
                {overview.city.hospital.woundedByType.map((w: any, i) => {
                  const typeId = w.typeId || `unknown-${i}`;
                  return (
                    <div key={typeId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{w.count} x {w.type}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="range" 
                          min="0" 
                          max={w.count} 
                          value={healAmounts[typeId] || 0} 
                          onChange={(e) => updateHealAmount(typeId, parseInt(e.target.value))} 
                        />
                        <span>{healAmounts[typeId] || 0}</span>
                      </div>
                    </div>
                  );
                })}
                <button onClick={handleHeal} style={{ background: '#4CAF50', color: 'white', padding: '0.5rem' }}>Heal Selected (1 Coin/Unit)</button>
             </div>
          ) : <p style={{ color: 'green' }}>Hospital empty.</p>}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h2>Battle History</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
          {logs.map(log => (
            <div key={log.id} 
              onClick={() => showLogDetails(log)}
              style={{ 
                border: '1px solid #ddd', 
                padding: '0.5rem', 
                cursor: 'pointer',
                borderLeft: `4px solid ${log.winner_id === overview.city.id ? 'green' : 'red'}` 
              }}>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{new Date(log.started_at).toLocaleString()}</div>
              <div>{log.battle_type} vs {log.attacker_id === overview.city.id ? 'Enemy' : 'Attacker'}</div>
              <div style={{ fontWeight: 'bold' }}>{log.winner_id === overview.city.id ? 'Victory' : 'Defeat'}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedLog && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2>Battle Report</h2>
              <button onClick={() => setSelectedLog(null)}>Close</button>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <h3>Loot</h3>
              {Object.entries(selectedLog.details.loot || {}).length > 0 ? (
                <ul>
                  {Object.entries(selectedLog.details.loot || {}).map(([res, amount]: any) => (
                    <li key={res}>{res}: {amount}</li>
                  ))}
                </ul>
              ) : <p>No loot.</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <h3>Attacker Losses</h3>
                {Object.entries(selectedLog.details.attackerLosses || {}).map(([unit, count]: any) => (
                  <div key={unit}>{unit}: -{count}</div>
                ))}
              </div>
              <div>
                <h3>Defender Losses</h3>
                {Object.entries(selectedLog.details.defenderLosses || {}).map(([unit, count]: any) => (
                  <div key={unit}>{unit}: -{count}</div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1rem', background: '#f9f9f9', padding: '1rem' }}>
              <h3>Combat Log</h3>
              {selectedLog.details.log?.map((line: string, i: number) => (
                <div key={i} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
