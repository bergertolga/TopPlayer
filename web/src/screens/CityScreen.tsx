
import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import { usePolling } from '../hooks/usePolling';
import type { ClientOverview, Building } from '../services/types';
import { useToast } from '../components/Toast';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';
import { ResourceDisplay } from '../components/ui/ResourceDisplay';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Sprite } from '../components/ui/Sprite';
import { GameInput, GameSelect } from '../components/ui/GameInput';
import { gameModal } from '../components/GameModal';
import { floatingText } from '../components/FloatingText';
import { Tooltip } from '../components/ui/Tooltip';
import { GAME_CONTENT } from '../content';

export function CityScreen() {
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  
  // Training State
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [troopTypes, setTroopTypes] = useState<any[]>([]);
  const [selectedTroop, setSelectedTroop] = useState<string | null>(null);
  const [trainAmount, setTrainAmount] = useState(1);

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

  const handleUpgrade = async (b: Building) => {
    if (!b.canUpgrade) {
      showToast('Max level reached', 'info');
      return;
    }
    
    const confirmed = await gameModal.confirm(
      `Upgrade ${b.type} to Level ${b.level + 1} for ${b.upgradeCost} Coins?`,
      'Upgrade Building'
    );

    if (!confirmed) return;
    
    try {
      await api.upgradeBuilding(b.type);
      showToast('Upgrade started!', 'success');
      floatingText.show('-' + b.upgradeCost + ' Coins', window.innerWidth / 2, window.innerHeight / 2, '#ffd700');
      fetchOverview();
    } catch (e: any) {
      showToast(e.message || 'Upgrade failed', 'error');
    }
  };

  const openTrainModal = async () => {
    setShowTrainModal(true);
    try {
      const data = await api.getTroopTypes();
      setTroopTypes(data.troopTypes);
      if (data.troopTypes.length > 0) setSelectedTroop(data.troopTypes[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrain = async () => {
    if (!selectedTroop || trainAmount <= 0) return;
    try {
      await api.trainTroops(selectedTroop, trainAmount);
      showToast('Training started!', 'success');
      setShowTrainModal(false);
      fetchOverview();
    } catch (e: any) {
      showToast(e.message || 'Training failed', 'error');
    }
  };

  const getBuildingSprite = (type: string, level: number) => {
    const lvlIndex = Math.min(Math.max(0, level - 1), 2); // Clamp to 0-2 for safety if sheet is small
    const size = 48;
    
    switch (type) {
      case 'TOWN_HALL':
        return <Sprite src="/assets/miniworld/Buildings/Wood/Keep.png" row={lvlIndex} col={0} sheetWidth={3} spriteSize={32} displaySize={size} />;
      case 'FARM': // Resources Row 0
        return <Sprite src="/assets/miniworld/Buildings/Wood/Resources.png" row={0} col={lvlIndex} sheetWidth={3} spriteSize={32} displaySize={size} />;
      case 'LUMBER_MILL': // Resources Row 1 (Woodcutter)
        return <Sprite src="/assets/miniworld/Buildings/Wood/Resources.png" row={1} col={lvlIndex} sheetWidth={3} spriteSize={32} displaySize={size} />;
      case 'QUARRY': // Resources Row 2 (Mine)
        return <Sprite src="/assets/miniworld/Buildings/Wood/Resources.png" row={2} col={lvlIndex} sheetWidth={3} spriteSize={32} displaySize={size} />;
      case 'WAREHOUSE':
        return <Sprite src="/assets/miniworld/Buildings/Wood/Huts.png" row={lvlIndex} col={0} sheetWidth={3} spriteSize={32} displaySize={size} />;
      case 'BARRACKS':
        return <Sprite src="/assets/miniworld/Buildings/Wood/Barracks.png" row={lvlIndex} col={0} sheetWidth={3} spriteSize={32} displaySize={size} />;
      case 'MARKET':
        return <Sprite src="/assets/miniworld/Buildings/Wood/Market.png" row={lvlIndex} col={0} sheetWidth={3} spriteSize={32} displaySize={size} />;
      default:
        return <Sprite src="/assets/miniworld/Buildings/Wood/Houses.png" row={0} col={0} sheetWidth={3} spriteSize={32} displaySize={size} />;
    }
  };

  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!overview) return <LoadingScreen message="Loading City..." />;

  const { city } = overview;

  return (
    <div className="flex-col gap-md">
      {/* City Header */}
      <section style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--color-gold)' }}>{city.name}</h2>
          <span style={{ fontSize: '0.9rem', color: '#aaa' }}>Level {city.level}</span>
        </div>
        
        <div className="flex gap-sm" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {Object.entries(city.resources).map(([res, amt]) => (
            <ResourceDisplay 
              key={res} 
              resourceCode={res}
              label={res} 
              amount={Math.floor(amt)} 
            />
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Buildings Section */}
        <GameCard title="Buildings" className="flex-col gap-md">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '1rem' }}>
            {city.buildings.map((b, i) => {
              const buildingsData = GAME_CONTENT.buildings as unknown as Record<string, { name: string, description: string }>;
              const content = buildingsData[b.type] || { name: b.type, description: 'Unknown building' };
              return (
                <div key={i} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  textAlign: 'center', 
                  padding: '0.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px'
                }}>
                  <Tooltip text={content.description}>
                    <div style={{ 
                      width: '64px', 
                      height: '64px', 
                      backgroundImage: 'url(/assets/layerlab/ui/Frame/SlotFrame_Square_02_Bg.png)',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                      cursor: 'help'
                    }}>
                        {getBuildingSprite(b.type, b.level)}
                    </div>
                  </Tooltip>
                  
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', minHeight: '2.4em' }}>
                    {content.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold)', marginBottom: '0.5rem' }}>
                    Lvl {b.level}
                  </span>
                  
                  <div className="flex-col gap-sm" style={{ width: '100%' }}>
                    {['FARM', 'LUMBER_MILL', 'QUARRY', 'MINE'].includes(b.type) && (
                      <GameButton 
                        size="sm" 
                        variant="blue" 
                        onClick={() => {
                          floatingText.show('+ Resources', window.innerWidth / 2, window.innerHeight / 2, '#4caf50');
                          fetchOverview();
                        }}
                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Collect
                      </GameButton>
                    )}
                    <GameButton 
                      size="sm" 
                      variant={b.canUpgrade ? 'green' : 'gray'}
                      disabled={!b.canUpgrade}
                      onClick={() => handleUpgrade(b)}
                      style={{ width: '100%', padding: '4px 8px', fontSize: '0.75rem' }}
                    >
                      {b.canUpgrade ? `Up (${b.upgradeCost})` : 'Max'}
                    </GameButton>
                  </div>
                </div>
              );
            })}
          </div>
        </GameCard>

        {/* Army Section */}
        <GameCard title="Army & Troops" className="flex-col gap-md">
          <div className="flex-col gap-sm">
            {city.troops.map((t, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '1rem', 
                background: 'rgba(0,0,0,0.3)', 
                padding: '0.75rem', 
                borderRadius: '4px',
                border: '1px solid var(--color-border)'
              }}>
                <Sprite 
                  src="/assets/miniworld/Characters/Soldiers/Melee/RedMelee/SwordsmanRed.png" 
                  row={0} 
                  col={0} 
                  sheetWidth={6} 
                  spriteSize={16} 
                  displaySize={32} 
                />
                <div style={{ flex: 1 }}>
                    <strong style={{ color: 'var(--color-text-highlight)' }}>{t.type}</strong>
                </div>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{t.count}</div>
              </div>
            ))}
            {city.troops.length === 0 && <p style={{ opacity: 0.6, textAlign: 'center' }}>No troops stationed.</p>}
          </div>
          
          <div style={{ marginTop: 'auto' }}>
            <GameButton variant="red" fullWidth onClick={openTrainModal}>
              Recruit Troops
            </GameButton>
          </div>
        </GameCard>
      </div>

      {/* Train Modal */}
      {showTrainModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', 
          zIndex: 1000,
          backdropFilter: 'blur(2px)'
        }}>
          <GameCard title="Recruit Troops" style={{ width: '400px', background: '#2c3e50' }}>
            <div className="flex-col gap-md">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Troop Type</label>
                <GameSelect 
                  fullWidth
                  value={selectedTroop || ''} 
                  onChange={e => setSelectedTroop(e.target.value)}
                >
                  {troopTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (Pow: {t.basePower}, Cost: {t.baseCostCoins})</option>
                  ))}
                </GameSelect>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#aaa' }}>Quantity</label>
                <GameInput 
                  fullWidth
                  type="number" 
                  min="1" 
                  value={trainAmount} 
                  onChange={e => setTrainAmount(parseInt(e.target.value))} 
                />
              </div>

              <div className="flex gap-md" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <GameButton variant="gray" onClick={() => setShowTrainModal(false)}>Cancel</GameButton>
                <GameButton variant="red" onClick={handleTrain}>Train</GameButton>
              </div>
            </div>
          </GameCard>
        </div>
      )}
    </div>
  );
}
