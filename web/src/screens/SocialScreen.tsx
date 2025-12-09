import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import { GameCard } from '../components/ui/GameCard';
import { GameButton } from '../components/ui/GameButton';
import { useToast } from '../components/Toast';
import { LoadingScreen } from '../components/ui/LoadingScreen';

interface ChatMessage {
  id: string;
  user_id: string;
  username?: string;
  message: string;
  created_at: number;
}

export function SocialScreen() {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getWorldChat(50);
      setMessages(res.messages || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load chat', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.postWorldMessage(input.trim());
      setInput('');
      await load();
    } catch (err: any) {
      showToast(err.message || 'Message failed', 'error');
    } finally {
      setSending(false);
    }
  };

  if (loading && messages.length === 0) {
    return <LoadingScreen message="Connecting to world chat..." />;
  }

  return (
    <div className="flex-col gap-md">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: 'var(--color-gold)' }}>Social</h2>
          <p style={{ margin: 0, opacity: 0.7 }}>World chat and community signals.</p>
        </div>
        <GameButton onClick={load} variant="gray">Refresh</GameButton>
      </header>

      <GameCard title="World Chat" className="flex-col gap-sm" style={{ height: '70vh' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.25rem' }}>
          {messages.map((m) => (
            <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.5rem 0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ color: 'var(--color-text-highlight)' }}>{m.username || m.user_id.slice(0, 6)}</strong>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{new Date(m.created_at).toLocaleTimeString()}</span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', whiteSpace: 'pre-wrap' }}>{m.message}</p>
            </div>
          ))}
          {messages.length === 0 && <p style={{ opacity: 0.6, textAlign: 'center' }}>No messages yet.</p>}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Share your status…"
            style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.4)', color: 'white' }}
            maxLength={140}
          />
          <GameButton variant="green" onClick={handleSend} disabled={sending || !input.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </GameButton>
        </div>
      </GameCard>
    </div>
  );
}


