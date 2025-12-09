
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/ApiClient';
import type { ClientOverview } from '../services/types';
import { GameCard } from '../components/ui/GameCard';
import { ResourceDisplay } from '../components/ui/ResourceDisplay';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { GameButton } from '../components/ui/GameButton';
import { useToast } from '../components/Toast';

export function ProfileScreen() {
  const [overview, setOverview] = useState<ClientOverview | null>(null);
  const [premiumBalance, setPremiumBalance] = useState<{ crowns: number; lastStipendAt?: number; boosts?: any[] } | null>(null);
  const [bundles, setBundles] = useState<Array<{ code: string; name: string; description: string; price: number; contents: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [stipendBusy, setStipendBusy] = useState(false);
  const [purchaseBusy, setPurchaseBusy] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const [ov, balance, bundleResp] = await Promise.all([
          api.getOverview(),
          api.getPremiumBalance().catch(() => ({ crowns: 0 })),
          api.getBundles().catch(() => ({ bundles: [] })),
        ]);
        setOverview(ov);
        setPremiumBalance(balance);
        setBundles(bundleResp.bundles || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const walletCrowns = premiumBalance?.crowns ?? overview?.premium.wallet.crowns ?? 0;
  const lastStipendAt = premiumBalance?.lastStipendAt;
  const boosts = premiumBalance?.boosts || [];

  const nextStipendText = useMemo(() => {
    if (!lastStipendAt) return 'Ready now';
    const nextAt = lastStipendAt + 24 * 60 * 60 * 1000;
    const delta = nextAt - Date.now();
    if (delta <= 0) return 'Ready now';
    const hours = Math.ceil(delta / (60 * 60 * 1000));
    return `Ready in ~${hours}h`;
  }, [lastStipendAt]);

  const handleClaimStipend = async () => {
    setStipendBusy(true);
    try {
      const res = await api.claimStipend();
      setPremiumBalance((prev) => ({ crowns: res.crowns, lastStipendAt: res.lastStipendAt, boosts: prev?.boosts || [] }));
      showToast('Daily stipend claimed!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Could not claim stipend', 'error');
    } finally {
      setStipendBusy(false);
    }
  };

  const handlePurchaseBundle = async (bundleCode: string) => {
    setPurchaseBusy(bundleCode);
    try {
      const res = await api.purchaseBundle(bundleCode, 'crowns');
      const remaining = res.remainingCrowns ?? walletCrowns;
      setPremiumBalance((prev) => ({ crowns: remaining, lastStipendAt: prev?.lastStipendAt, boosts: prev?.boosts || [] }));
      showToast('Bundle purchased!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Purchase failed', 'error');
    } finally {
      setPurchaseBusy(null);
    }
  };

  if (loading || !overview) return <LoadingScreen message="Loading Profile..." />;

  const { premium } = overview;
  const formatContents = (contents: any) => {
    const items: Array<{ label: string; value: string }> = [];
    if (!contents || typeof contents !== 'object') return items;
    if (contents.crowns) items.push({ label: 'Crowns', value: String(contents.crowns) });
    if (contents.coins) items.push({ label: 'Coins', value: String(contents.coins) });
    if (contents.resources && typeof contents.resources === 'object') {
      Object.entries(contents.resources).forEach(([k, v]) => {
        items.push({ label: k, value: String(v) });
      });
    }
    if (Array.isArray(contents.boosts)) {
      contents.boosts.forEach((b: any) => items.push({ label: b.code || 'boost', value: `${b.hours ?? b.duration ?? ''}h` }));
    }
    return items;
  };

  return (
    <div className="flex-col gap-lg">
      <h1 style={{ color: 'var(--color-gold)' }}>Profile & Premium</h1>
      
      <div className="flex gap-md">
        <GameCard title="Wallet" className="flex gap-lg items-center" style={{ minWidth: '300px' }}>
          <ResourceDisplay 
            icon="/assets/layerlab/resources/crowns.png" 
            label="Crowns" 
            amount={walletCrowns} 
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
          <div className="flex-col gap-sm" style={{ marginLeft: 'auto' }}>
            <GameButton variant="green" onClick={handleClaimStipend} disabled={stipendBusy}>
              {stipendBusy ? 'Claiming…' : 'Claim daily Crowns'}
            </GameButton>
            <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{nextStipendText}</span>
          </div>
        </GameCard>
      </div>

      <GameCard title="Active Boosts" className="flex-col gap-sm">
        {boosts.length === 0 && <span style={{ opacity: 0.6 }}>No active boosts</span>}
        {boosts.map((b: any) => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontWeight: 'bold' }}>{b.boost_code}</div>
              <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{b.metadata_json}</div>
            </div>
            <span style={{ color: 'var(--color-gold)' }}>{new Date(b.expires_at).toLocaleString()}</span>
          </div>
        ))}
      </GameCard>

      <GameCard title="Bundles" className="flex-col gap-md">
        {bundles.length === 0 && <span style={{ opacity: 0.6 }}>No bundles available</span>}
        <div className="flex-col gap-sm">
          {bundles.map((b) => {
            const items = formatContents(b.contents);
            return (
              <div key={b.code} style={{ display: 'flex', gap: '1rem', padding: '0.85rem', border: '1px solid var(--color-border)', borderRadius: '10px', background: 'rgba(0,0,0,0.35)', boxShadow: '0 6px 16px rgba(0,0,0,0.25)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '1.05rem' }}>{b.name}</div>
                  <div style={{ fontSize: '0.95rem', color: '#cfd8f0', marginTop: '0.25rem' }}>{b.description}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {items.map((it, idx) => (
                      <span key={idx} style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', color: '#e8f0ff' }}>
                        {it.label}: {it.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-col gap-sm" style={{ alignItems: 'flex-end', display: 'flex', minWidth: '130px' }}>
                  <div style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{b.price} Crowns</div>
                  <GameButton 
                    variant="green" 
                    onClick={() => handlePurchaseBundle(b.code)} 
                    disabled={purchaseBusy === b.code}
                    fullWidth
                  >
                    {purchaseBusy === b.code ? 'Purchasing…' : 'Buy'}
                  </GameButton>
                </div>
              </div>
            );
          })}
        </div>
      </GameCard>

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
