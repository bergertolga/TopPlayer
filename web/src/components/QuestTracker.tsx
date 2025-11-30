
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/ApiClient';
import { GameButton } from './ui/GameButton';

export function QuestTracker() {
  const navigate = useNavigate();
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
      fetchQuests();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigate = (quest: any) => {
    const text = (quest.title + ' ' + quest.description).toLowerCase();
    if (text.includes('attack') || text.includes('defeat')) navigate('/map');
    else if (text.includes('market') || text.includes('trade')) navigate('/market');
    else if (text.includes('council') || text.includes('contribute')) navigate('/council');
    else if (text.includes('recruit') || text.includes('train')) navigate('/'); // City
    else if (text.includes('build') || text.includes('upgrade')) navigate('/'); // City
    else if (text.includes('research')) navigate('/council');
  };

  if (loading || quests.length === 0) return null;

  const topQuest = quests[0];

  return (
    <div style={{
      // ... existing styles
    }}>
      {/* ... existing header ... */}
      
      <div style={{ marginBottom: '0.5rem' }}>
        <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{topQuest.title}</strong>
        <p style={{ fontSize: '0.85rem', color: '#ccc', margin: 0 }}>{topQuest.description}</p>
      </div>

      {/* ... progress bar ... */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ flex: 1, height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${Math.min(100, (topQuest.progress / topQuest.target) * 100)}%`, 
            height: '100%', 
            background: 'var(--color-info)',
            transition: 'width 0.5s ease'
          }}></div>
        </div>
        <span style={{ fontSize: '0.8rem' }}>{topQuest.progress}/{topQuest.target}</span>
      </div>

      {topQuest.progress >= topQuest.target ? (
        <GameButton 
          size="sm" 
          variant="green" 
          fullWidth 
          onClick={() => handleClaim(topQuest.id)}
          className="animate-pulse"
        >
          Claim Reward
        </GameButton>
      ) : (
        <GameButton 
          size="sm" 
          variant="blue" 
          fullWidth 
          onClick={() => handleNavigate(topQuest)}
          style={{ opacity: 0.9 }}
        >
          Go
        </GameButton>
      )}
    </div>
  );
}

