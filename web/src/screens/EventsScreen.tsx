
import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import type { GameEvent } from '../services/types';
import { GameCard } from '../components/ui/GameCard';
import { GameInput } from '../components/ui/GameInput';
import { GameButton } from '../components/ui/GameButton';
import { useToast } from '../components/Toast';
import { usePolling } from '../hooks/usePolling';

export function EventsScreen() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [worldChat, setWorldChat] = useState<Array<{ id: string; user_id: string; username?: string; message: string; created_at: number }>>([]);
  const [message, setMessage] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    api.getOverview().then(d => setEvents(d.events.active));
    fetchWorldChat();
  }, []);

  const fetchWorldChat = async () => {
    try {
      const res = await api.getWorldChat(50);
      setWorldChat(res.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  usePolling(fetchWorldChat, 15000);

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      await api.postWorldMessage(message.trim());
      setMessage('');
      fetchWorldChat();
    } catch (e: any) {
      showToast(e.message || 'Could not send message', 'error');
    }
  };

  return (
    <div className="flex-col gap-lg" style={{ maxWidth: 'var(--panel-max-width)', margin: '0 auto', paddingBottom: '2rem' }}>
      <GameCard title="Active Events">
        {events.length === 0 ? <p style={{ color: '#d7e2ff' }}>No active events.</p> : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="flex-col gap-md">
            {events.map(e => (
              <li key={e.id} style={{ border: '1px solid var(--color-border)', padding: '1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.03)' }}>
                <h3 style={{ margin: 0, color: 'var(--color-gold)', textShadow: '0 1px 2px black' }}>{e.name}</h3>
                <p style={{ margin: '0.2rem 0', color: '#cfd8f0' }}>Type: {e.type} | Scope: {e.scope}</p>
                <p style={{ margin: 0, color: '#e8f0ff' }}>Ends at: {new Date(e.end_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </GameCard>

      <GameCard title="World Chat">
        <div className="flex-col gap-md">
          <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px', padding: '0.75rem', background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
            {worldChat.length === 0 && <p style={{ opacity: 0.6, color: '#cfd8f0' }}>No messages yet.</p>}
            {worldChat.map((m) => (
              <div key={m.id} style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{m.username || m.user_id.slice(0, 6)}</span>: <span style={{ color: '#e8f0ff' }}>{m.message}</span>
                <span style={{ color: '#9fb0c9', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                  {new Date(m.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-sm">
            <GameInput fullWidth value={message} onChange={e => setMessage(e.target.value)} placeholder="Share with the realm..." />
            <GameButton variant="blue" onClick={handleSend}>Send</GameButton>
          </div>
        </div>
      </GameCard>
    </div>
  );
}

