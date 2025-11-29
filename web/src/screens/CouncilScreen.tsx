
import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';
import type { TechNode } from '../services/types';

export function CouncilScreen() {
  const [data, setData] = useState<any>(null);
  const [chat, setChat] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [tech, setTech] = useState<TechNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCouncil = async () => {
    try {
      const overview = await api.getOverview();
      if (!overview.council) {
        setLoading(false);
        return;
      }
      
      const [profile, techData, chatData] = await Promise.all([
        api.getCouncilProfile(overview.council.id),
        api.getCouncilTechTree(),
        api.getCouncilChat(overview.council.id)
      ]);
      
      setData(profile);
      setTech(techData.tech_tree);
      setChat(chatData.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouncil();
  }, []);

  const handleSend = async () => {
    if (!msg.trim()) return;
    try {
      await api.sendCouncilMessage(msg);
      setMsg('');
      fetchCouncil(); // Refresh chat
    } catch (e) {
      alert('Failed to send message');
    }
  };

  const handleContribute = async (code: string) => {
    const amount = prompt("Enter amount of COINS to contribute:");
    if (!amount) return;
    try {
      await api.contributeToTech(code, { COINS: parseInt(amount) });
      alert('Contribution sent!');
      fetchCouncil();
    } catch (e) {
      alert('Failed to contribute');
    }
  };

  if (loading) return <div>Loading Council...</div>;
  if (!data) return <div>You are not in a council. <button onClick={() => alert('Create via API for now')}>Create Council</button></div>;

  return (
    <div style={{ padding: '1rem', display: 'flex', gap: '2rem' }}>
      <div style={{ flex: 2 }}>
        <h1>{data.identity.name}</h1>
        <p>Prestige: {data.identity.prestige} | Members: {data.stats.members}</p>
        
        <h2>Tech Tree</h2>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {tech.map(t => (
            <div key={t.code} style={{ border: '1px solid #ccc', padding: '1rem', background: t.status === 'completed' ? '#e8f5e9' : 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{t.name} (Tier {t.tier})</strong>
                <span>{t.status}</span>
              </div>
              <p>{t.description}</p>
              {t.status === 'active' && (
                <div>
                  <progress value={t.progress} max={100} style={{ width: '100%' }}></progress>
                  <button onClick={() => handleContribute(t.code)} style={{ marginTop: '0.5rem' }}>Contribute Coins</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, border: '1px solid #ddd', display: 'flex', flexDirection: 'column', height: '80vh' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', background: '#f5f5f5' }}>
          <h3>Council Chat</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {chat.map(m => (
            <div key={m.id}>
              <strong>{m.username}: </strong> {m.message}
            </div>
          ))}
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid #ddd' }}>
          <input 
            type="text" 
            value={msg} 
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
      </div>
    </div>
  );
}
