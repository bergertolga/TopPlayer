import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';

interface QuestLogProps {
  onClose: () => void;
}

export function QuestLog({ onClose }: QuestLogProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'milestones'>('daily');
  const [quests, setQuests] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qData, mData] = await Promise.all([
          api.getQuests(),
          api.getMilestones()
        ]);
        setQuests(qData.active || []);
        setMilestones(mData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleClaimQuest = async (questId: string) => {
    try {
      await api.claimQuestReward(questId);
      // Refresh
      const qData = await api.getQuests();
      setQuests(qData.active || []);
      alert('Reward claimed!');
    } catch (e: any) {
      alert(e.message || 'Failed to claim');
    }
  };

  const handleClaimMilestone = async (id: string) => {
    try {
      await api.claimMilestone(id);
      // Refresh
      const mData = await api.getMilestones();
      setMilestones(mData);
      alert('Milestone claimed!');
    } catch (e: any) {
      alert(e.message || 'Failed to claim');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'white', padding: '2rem', borderRadius: '8px', width: '600px', maxHeight: '80vh', overflowY: 'auto',
        position: 'relative', display: 'flex', flexDirection: 'column'
      }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
        >
          &times;
        </button>

        <h2 style={{ marginBottom: '1.5rem' }}>Quest Log</h2>

        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '1rem' }}>
          <button 
            onClick={() => setActiveTab('daily')}
            style={{ padding: '0.5rem 1rem', background: activeTab === 'daily' ? '#eee' : 'transparent', border: 'none', borderBottom: activeTab === 'daily' ? '2px solid blue' : 'none', cursor: 'pointer' }}
          >
            Daily Quests
          </button>
          <button 
            onClick={() => setActiveTab('milestones')}
            style={{ padding: '0.5rem 1rem', background: activeTab === 'milestones' ? '#eee' : 'transparent', border: 'none', borderBottom: activeTab === 'milestones' ? '2px solid blue' : 'none', cursor: 'pointer' }}
          >
            Milestones
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <p>Loading...</p> : (
            <>
              {activeTab === 'daily' && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {quests.map((q: any) => (
                    <div key={q.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{q.title || 'Daily Quest'}</strong>
                        <span>{q.status}</span>
                      </div>
                      <p>{q.description}</p>
                      <progress value={q.progress} max={q.target} style={{ width: '100%' }} />
                      <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleClaimQuest(q.id)}
                          disabled={q.progress < q.target}
                          style={{ background: q.progress >= q.target ? '#4CAF50' : '#ddd', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px' }}
                        >
                          {q.status === 'completed' ? 'Claimed' : 'Turn In / Claim'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {quests.length === 0 && <p>No active daily quests.</p>}
                </div>
              )}

              {activeTab === 'milestones' && milestones && (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {milestones.definitions?.map((m: any) => {
                    const isCompleted = milestones.completed?.some((c: any) => c.milestone_id === m.id);
                    // Determine if locked? Logic might be complex, let's just show all or check roadmap
                    const isUnlocked = true; // Simplified
                    
                    return (
                      <div key={m.id} style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px', opacity: isUnlocked ? 1 : 0.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong>{m.name}</strong>
                          {isCompleted ? <span style={{ color: 'green' }}>✓ Completed</span> : <span>Locked</span>}
                        </div>
                        <p>{m.description}</p>
                        {!isCompleted && (
                          <button 
                            onClick={() => handleClaimMilestone(m.id)}
                            style={{ background: '#2196F3', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px' }}
                          >
                            Claim (If Done)
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
