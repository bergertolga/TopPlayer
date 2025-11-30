
import { useEffect, useState } from 'react';
import { GameCard } from './ui/GameCard';
import { GameButton } from './ui/GameButton';
import { Icon } from './ui/Icon';

interface BattleResult {
  victory: boolean;
  troopsLost: number;
  loot: Record<string, number>;
}

let battleListener: ((result: BattleResult | null) => void) | null = null;

export const battleModal = {
  show: (result: BattleResult) => {
    return new Promise<void>((resolve) => {
      if (battleListener) {
        battleListener(result);
        // Auto-resolve immediately or wait for close? Usually wait for close.
        // For now, we just show it.
      }
      resolve();
    });
  }
};

export function BattleResultProvider() {
  const [result, setResult] = useState<BattleResult | null>(null);

  useEffect(() => {
    battleListener = setResult;
    return () => { battleListener = null; };
  }, []);

  if (!result) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 2100,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <GameCard 
        title={result.victory ? "VICTORY!" : "DEFEAT"} 
        style={{ 
          width: '450px', 
          background: result.victory ? 'linear-gradient(to bottom, #1b5e20, #2c3e50)' : 'linear-gradient(to bottom, #b71c1c, #2c3e50)',
          border: `2px solid ${result.victory ? 'var(--color-gold)' : '#ff5252'}`
        }}
      >
        <div className="flex-col gap-lg items-center text-center">
          <Icon 
            src={result.victory ? '/assets/layerlab/ui/icons/Icon_Crown.png' : '/assets/layerlab/ui/icons/Icon_Skull.png'} 
            size={80} 
          />
          
          <div>
            <h3 style={{ margin: 0, color: '#ccc' }}>Casualties</h3>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff5252', margin: '0.5rem 0' }}>
              -{result.troopsLost} Troops
            </p>
          </div>

          {result.victory && Object.keys(result.loot).length > 0 && (
            <div style={{ width: '100%' }}>
              <h3 style={{ margin: 0, color: '#ccc', marginBottom: '0.5rem' }}>Loot Gained</h3>
              <div className="flex gap-sm justify-center flex-wrap">
                {Object.entries(result.loot).map(([res, amt]) => (
                  <div key={res} style={{ 
                    background: 'rgba(0,0,0,0.5)', 
                    padding: '4px 8px', 
                    borderRadius: '4px',
                    border: '1px solid var(--color-gold-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-gold)' }}>+{amt} {res}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <GameButton 
            fullWidth 
            variant="blue" 
            onClick={() => setResult(null)}
            style={{ marginTop: '1rem' }}
          >
            Close
          </GameButton>
        </div>
      </GameCard>
    </div>
  );
}


