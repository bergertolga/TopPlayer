
import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';

interface QuestLogProps {
  onClose: () => void;
}

export function QuestLog({ onClose }: QuestLogProps) {
  const [quests, setQuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuests = async () => {
    try {
      const data = await api.getQuests();
      setQuests(data.quests || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuests();
  }, []);

  const handleClaim = async (id: string) => {
    try {
      await api.claimQuestReward(id);
      alert('Reward claimed!');
      fetchQuests();
    } catch (e) {
      alert('Failed to claim reward');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2>Quest Log</h2>
          <button onClick={onClose}>Close</button>
        </div>

        {loading ? <p>Loading quests...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quests.length === 0 && <p>No active quests.</p>}
            {quests.map((q: any) => (
              <div key={q.id} style={{ border: '1px solid #ddd', padding: '1rem', background: q.status === 'completed' ? '#e8f5e9' : 'white' }}>
                <h3>{q.title}</h3>
                <p>{q.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <span>Progress: {q.progress}/{q.target}</span>
                  {q.status === 'completed' && !q.claimed && (
                    <button onClick={() => handleClaim(q.id)} style={{ background: '#4CAF50', color: 'white', border: 'none', padding: '0.25rem 0.5rem' }}>
                      Claim Reward
                    </button>
                  )}
                  {q.claimed && <span style={{ color: 'green' }}>✓ Claimed</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

