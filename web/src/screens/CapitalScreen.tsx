import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';
import { useToast } from '../components/Toast';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { gameModal } from '../components/GameModal';

export function CapitalScreen() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchCapital = async () => {
    try {
      const data = await api.getCapitalState();
      setState(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapital();
  }, []);

  const handleFulfill = async (code: string) => {
    try {
      await api.fulfillCapitalRequest(code);
      showToast('Request fulfilled!', 'success');
      fetchCapital(); // Refresh
    } catch (e: any) {
      showToast(e.message || 'Failed to fulfill request', 'error');
    }
  };

  const handlePurchase = async (code: string) => {
    if (!await gameModal.confirm('Purchase this item?')) return;
    try {
      await api.purchaseCapitalItem(code);
      showToast('Item purchased!', 'success');
      fetchCapital();
    } catch (e: any) {
      gameModal.error(e.message || 'Purchase failed');
    }
  };

  if (loading) return <LoadingScreen message="Entering Capital..." />;
  if (!state) return <div>Failed to load Capital</div>;

  return (
    <div className="flex-col gap-lg" style={{ height: '100%' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, color: 'var(--color-gold)', textShadow: '0 2px 4px black' }}>The Capital</h1>
        <div style={{ 
          marginTop: '1rem', 
          background: 'rgba(0,0,0,0.6)', 
          padding: '1rem', 
          borderRadius: '8px', 
          border: '1px solid var(--color-gold-dim)',
          display: 'inline-block'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>{state.king?.name}</h3>
          <p style={{ margin: 0, fontStyle: 'italic', color: '#ccc' }}>"{state.king?.message || 'Silence reigns.'}"</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', flex: 1, minHeight: 0 }}>
        
        {/* Left Column: Standing & Requests */}
        <div className="flex-col gap-lg" style={{ overflowY: 'auto' }}>
          <GameCard title="Your Standing">
            <div className="flex-col gap-sm">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Favor Points</span>
                <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{state.favor?.points || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#aaa' }}>Tier</span>
                <span style={{ color: 'var(--color-text-highlight)' }}>{state.favor?.tier?.name || 'Unknown'} (Rank {state.favor?.tier?.tier || 0})</span>
              </div>
              {state.favor?.nextTier && (
                <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.85rem' }}>
                  Next: {state.favor.nextTier.name} at {state.favor.nextTier.required} Favor
                </div>
              )}
            </div>
          </GameCard>

          <GameCard title="Royal Requests" className="flex-col gap-md">
            {state.requests?.length === 0 && <p style={{ opacity: 0.5, textAlign: 'center' }}>No active requests.</p>}
            {state.requests?.map((req: any) => (
              <div key={req.code} style={{ 
                background: 'rgba(0,0,0,0.3)', 
                padding: '1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--color-border)'
              }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-gold)' }}>{req.name}</h4>
                <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>{req.description}</p>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '0.5rem',
                  fontSize: '0.9rem' 
                }}>
                  <span style={{ color: '#aaa' }}>Needs:</span>
                  <span style={{ fontWeight: 'bold' }}>{req.amount} {req.resource}</span>
                </div>
                <GameButton size="sm" fullWidth onClick={() => handleFulfill(req.code)}>Fulfill Request</GameButton>
              </div>
            ))}
          </GameCard>
        </div>

        {/* Right Column: Royal Store */}
        <GameCard title="Royal Store" className="flex-col" style={{ minHeight: 0 }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '1rem', 
            overflowY: 'auto',
            padding: '0.5rem' 
          }}>
            {state.store?.map((item: any) => (
              <div key={item.code} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '1rem', 
                borderRadius: '8px', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{item.name}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem' }}>{item.description}</p>
                </div>
                <div>
                  <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: item.costFavor > 0 ? '#ab47bc' : '#ffd700' }}>
                    {item.costFavor > 0 ? `${item.costFavor} Favor` : `${item.costCoins} Coins`}
                  </div>
                  <GameButton size="sm" fullWidth variant="blue" onClick={() => handlePurchase(item.code)}>Purchase</GameButton>
                </div>
              </div>
            ))}
            {(!state.store || state.store.length === 0) && <p style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Store is currently empty.</p>}
          </div>
        </GameCard>
      </div>
    </div>
  );
}
