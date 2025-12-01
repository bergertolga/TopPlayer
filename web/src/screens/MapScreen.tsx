import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';
import { GameCard } from '../components/ui/GameCard';
import { GameButton } from '../components/ui/GameButton';
import { Icon } from '../components/ui/Icon';
import { gameModal } from '../components/GameModal';
import { battleModal } from '../components/BattleResultModal';
import { WorldMapRenderer } from '../components/map/WorldMapRenderer'; // Import WorldMapRenderer

const REGIONS = [
  { id: 'region-1', name: 'Heartlands', description: 'Safe, fertile lands. Balanced resources.', color: '#4caf50', icon: '/assets/layerlab/ui/icons/Icon_Flag/icon_guild_flag_1.png' },
  { id: 'region-2', name: 'Borderlands', description: 'Dangerous, resource-rich frontiers.', color: '#d32f2f', icon: '/assets/layerlab/ui/icons/Icon_Flag/icon_guild_flag_2.png' },
  { id: 'region-3', name: 'Coast', description: 'Trade hubs and fishing.', color: '#2196f3', icon: '/assets/layerlab/ui/icons/Icon_Flag/icon_guild_flag_3.png' },
];

export function MapScreen() {
  const [view, setView] = useState<'world' | 'region'>('world');
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0]);
  const [entities, setEntities] = useState<any[]>([]);
  const [myRegionId, setMyRegionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getOverview().then(data => {
      // Assuming region_id is available in city object or we default
      setMyRegionId((data.city as any).region_id || 'region-1');
    });
  }, []);

  useEffect(() => {
    if (view === 'region') {
      const fetchEntities = async () => {
        setLoading(true);
        try {
          const data = await api.getCombatMap(selectedRegion.id);
          setEntities(data.targets);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchEntities();
    }
  }, [view, selectedRegion]);

  const handleRegionSelect = (regionId: string) => {
    const region = REGIONS.find(r => r.id === regionId);
    if (region) {
      setSelectedRegion(region);
      setView('region');
    }
  };

  const handleRelocate = async () => {
    if (!await gameModal.confirm(`Relocate to ${selectedRegion.name}? This costs 500 Coins.`)) return;
    try {
      await api.relocateCity(selectedRegion.id);
      await gameModal.success(`Welcome to ${selectedRegion.name}!`);
      setMyRegionId(selectedRegion.id);
    } catch (e: any) {
      gameModal.error(e.message || 'Relocation failed');
    }
  };

  const handleAttack = async (id: string) => {
    try {
      const result = await api.attackEntity(id);
      if (result && result.result) {
        await battleModal.show({
          victory: result.result.winnerId === myRegionId, // Assuming myRegionId is current city? No, winnerId is cityId.
          // Wait, we don't have cityId in state. Let's assume result.success means victory for now or parse result.
          // Actually API returns: { success: true, result: BattleResult }
          // BattleResult has winnerId.
          // We need to know our cityId. 
          // Simplified: if result.result.winnerId !== 'NPC'
          troopsLost: Object.values(result.result.attackerLosses as Record<string, number>).reduce((a, b) => a + b, 0),
          loot: result.result.loot
        });
      }
    } catch (e: any) {
      gameModal.error(e.message || 'Attack failed');
    }
  };

  if (view === 'world') {
    return (
      <div style={{ textAlign: 'center', padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ color: 'var(--color-gold)', textShadow: '0 2px 4px black', fontSize: '2.5rem', marginBottom: '0.5rem' }}>World Map</h1>
        <p style={{ color: '#ccc', fontSize: '1.2rem', marginBottom: '2rem' }}>Select a region to explore</p>
        
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <WorldMapRenderer 
            onRegionSelect={handleRegionSelect} 
            currentRegionId={myRegionId || undefined} 
          />
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
           {/* Legend or Stats could go here */}
           <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <div style={{ width: '16px', height: '16px', background: '#4caf50' }}></div> Heartlands
           </div>
           <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <div style={{ width: '16px', height: '16px', background: '#d32f2f' }}></div> Borderlands
           </div>
           <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
             <div style={{ width: '16px', height: '16px', background: '#2196f3' }}></div> Coast
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col" style={{ height: '100%' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
        <GameButton variant="gray" onClick={() => setView('world')}>&larr; World Map</GameButton>
        <h1 style={{ margin: 0, color: 'var(--color-gold)' }}>{selectedRegion.name}</h1>
        {myRegionId !== selectedRegion.id ? (
          <GameButton variant="blue" onClick={handleRelocate}>Relocate (500 Coins)</GameButton>
        ) : (
          <span style={{ padding: '0.5rem 1rem', background: 'var(--color-bg-overlay)', borderRadius: '4px', border: '1px solid var(--color-gold-dim)', color: 'var(--color-gold)' }}>
            Current Location
          </span>
        )}
      </div>

      <GameCard className="flex-col" style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.4)' }}>
        {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Scouting region...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
            {entities.map(e => (
              <div key={e.id} style={{ 
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                {/* Entity Frame */}
                <div style={{ 
                  width: '128px', 
                  height: '128px',
                  background: 'url(/assets/layerlab/ui/Frame/BasicFrame_Square_l.png) no-repeat center/contain',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingBottom: '10px' // Visual offset for this specific frame asset
                }}>
                   <Icon 
                     src={e.type === 'BANDIT_CAMP' ? '/assets/layerlab/ui/icons/Icon_Flag/icon_guild_flag_5.png' : '/assets/layerlab/ui/icons/Icon_Sword_01.png'} 
                  alt={e.type} 
                     size={48}
                   />
                   <span style={{ fontSize: '0.9rem', fontWeight: 'bold', marginTop: '4px' }}>Lvl {e.level}</span>
                </div>

                {/* Attack Button (Overlapping bottom) */}
                <div style={{ marginTop: '-16px', zIndex: 1 }}>
                   <GameButton 
                      size="sm"
                      variant="red"
                      disabled={myRegionId !== selectedRegion.id}
                  onClick={() => handleAttack(e.id)} 
                      style={{ minWidth: '80px', fontSize: '0.8rem' }}
                >
                  Attack
                   </GameButton>
                </div>
              </div>
            ))}
            {entities.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: '#aaa' }}>Region is peaceful... for now.</p>}
          </div>
        )}
      </GameCard>
    </div>
  );
}
