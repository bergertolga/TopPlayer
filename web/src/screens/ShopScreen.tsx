import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import { GameCard } from '../components/ui/GameCard';
import { GameButton } from '../components/ui/GameButton';
import { useToast } from '../components/Toast';
import { LoadingScreen } from '../components/ui/LoadingScreen';

interface Bundle {
  code: string;
  name: string;
  description?: string;
  price: number;
  contents: Record<string, unknown>;
  iapProductId?: string | null;
}

export function ShopScreen() {
  const { showToast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<{ crowns: number; lastStipendAt?: number } | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [claimingStipend, setClaimingStipend] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [bundlesRes, balanceRes] = await Promise.all([
        api.getBundles(),
        api.getPremiumBalance(),
      ]);
      setBundles(bundlesRes.bundles || []);
      setBalance(balanceRes);
    } catch (err: any) {
      showToast(err.message || 'Failed to load shop', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePurchase = async (bundle: Bundle) => {
    if (purchasing) return;
    setPurchasing(bundle.code);
    try {
      await api.purchaseBundle(bundle.code, 'crowns');
      showToast(`Purchased ${bundle.name}`, 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Purchase failed', 'error');
    } finally {
      setPurchasing(null);
    }
  };

  const handleStipend = async () => {
    if (claimingStipend) return;
    setClaimingStipend(true);
    try {
      await api.claimStipend();
      showToast('Daily stipend claimed', 'success');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Stipend unavailable', 'error');
    } finally {
      setClaimingStipend(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading shop..." />;
  }

  return (
    <div className="flex-col gap-md">
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--color-gold)' }}>Premium Shop</h2>
          <p style={{ margin: 0, opacity: 0.7 }}>Bundles, boosts, and stipends that accelerate growth.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
            <strong>Crowns:</strong> {balance?.crowns ?? 0}
          </div>
          <GameButton variant="yellow" onClick={handleStipend} disabled={claimingStipend}>
            {claimingStipend ? 'Claiming…' : 'Claim Daily Stipend'}
          </GameButton>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {bundles.map((bundle) => (
          <GameCard key={bundle.code} title={bundle.name} className="flex-col gap-sm">
            <p style={{ margin: 0, minHeight: '3em', opacity: 0.8 }}>{bundle.description || 'Special bundle'}</p>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
              <strong>Contents:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0.5rem 0 0 0', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: 6 }}>
                {JSON.stringify(bundle.contents, null, 2)}
              </pre>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
              <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{bundle.price} Crowns</span>
              <GameButton variant="green" disabled={purchasing === bundle.code} onClick={() => handlePurchase(bundle)}>
                {purchasing === bundle.code ? 'Purchasing…' : 'Buy'}
              </GameButton>
            </div>
            {bundle.iapProductId && (
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>Cash option: {bundle.iapProductId}</p>
            )}
          </GameCard>
        ))}
        {bundles.length === 0 && (
          <GameCard title="No offers" className="flex-col">
            <p style={{ margin: 0, opacity: 0.7 }}>Check back later for limited-time bundles.</p>
          </GameCard>
        )}
      </div>
    </div>
  );
}


