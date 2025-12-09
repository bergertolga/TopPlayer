import { useMemo } from 'react';
import { api } from '../services/ApiClient';
import { GameCard } from '../components/ui/GameCard';
import { GameButton } from '../components/ui/GameButton';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';

export function AccountScreen() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const userId = api.getUserId();

  const anonymized = useMemo(() => {
    if (!userId) return '';
    return `${userId.slice(0, 6)}...${userId.slice(-4)}`;
  }, [userId]);

  const handleCopy = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      showToast('User ID copied', 'success');
    } catch (err: any) {
      showToast(err.message || 'Copy failed', 'error');
    }
  };

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  return (
    <div className="flex-col gap-md">
      <h2 style={{ margin: 0, color: 'var(--color-gold)' }}>Account</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <GameCard title="Identity" className="flex-col gap-sm">
          <p style={{ margin: 0, opacity: 0.75 }}>Keep this ID to restore progress across devices.</p>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--color-border)', borderRadius: 8, padding: '0.75rem', fontFamily: 'monospace' }}>
            {anonymized || 'Not logged in'}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <GameButton onClick={handleCopy} disabled={!userId}>Copy ID</GameButton>
            <GameButton variant="gray" onClick={handleLogout}>Logout</GameButton>
          </div>
        </GameCard>

        <GameCard title="Support" className="flex-col gap-sm">
          <p style={{ margin: 0, opacity: 0.75 }}>If you hit issues, share your User ID and steps to reproduce.</p>
          <GameButton variant="yellow" onClick={() => showToast('Support mailbox not wired yet', 'info')}>
            Contact Support
          </GameButton>
        </GameCard>
      </div>
    </div>
  );
}


