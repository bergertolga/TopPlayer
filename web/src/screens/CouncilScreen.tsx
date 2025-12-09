import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';
import type { TechNode } from '../services/types';
import { useToast } from '../components/Toast';
import { GameButton } from '../components/ui/GameButton';
import { GameCard } from '../components/ui/GameCard';
import { GameInput, GameSelect } from '../components/ui/GameInput';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { gameModal } from '../components/GameModal';
import { usePolling } from '../hooks/usePolling';

export function CouncilScreen() {
  const [data, setData] = useState<any>(null);
  const [tech, setTech] = useState<TechNode[]>([]);
  const [chat, setChat] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'treasury' | 'works'>('overview');
  const [msg, setMsg] = useState('');
  const { showToast } = useToast();
  
  // Creation/Join State
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('merchants_guild');
  const [joinId, setJoinId] = useState('');

  const fetchCouncil = async () => {
    try {
      const myCouncil = await api.getMyCouncil();
      
      if (!myCouncil.council) {
        setData(null);
        setLoading(false);
        return;
      }

      const [techData, chatData] = await Promise.all([
        api.getCouncilTechTree(),
        api.getCouncilChat(myCouncil.council.id)
      ]);

      setData(myCouncil);
      setTech(techData.tech_tree || []);
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

  const fetchCouncilChat = async () => {
    if (!data?.council?.id) return;
    try {
      const chatData = await api.getCouncilChat(data.council.id);
      setChat(chatData.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  usePolling(fetchCouncilChat, 15000);

  const handleCreate = async () => {
    if (!createName) return;
    try {
      await api.createCouncil(createName, createCode);
      showToast('Council created!', 'success');
      fetchCouncil();
    } catch (e: any) {
      showToast(e.message || 'Failed to create council', 'error');
    }
  };

  const handleJoin = async () => {
    if (!joinId) return;
    try {
      await api.joinCouncil(joinId);
      showToast('Joined council!', 'success');
      fetchCouncil();
    } catch (e: any) {
      showToast(e.message || 'Failed to join', 'error');
    }
  };

  const handleSend = async () => {
    if (!msg.trim()) return;
    try {
      await api.sendCouncilMessage(msg);
      setMsg('');
      fetchCouncilChat();
    } catch (e) {
      showToast('Failed to send message', 'error');
    }
  };

  const handleContributeTech = async (code: string) => {
    const amount = prompt("Enter amount of COINS to contribute:");
    if (!amount) return;
    try {
      await api.contributeToTech(code, { COINS: parseInt(amount) });
      await gameModal.success('Contribution sent!');
      fetchCouncil();
    } catch (e: any) {
      gameModal.error(e.message || 'Failed to contribute');
    }
  };

  const handleContributeWork = async (workId: string) => {
    const amount = prompt("Enter amount of COINS to contribute:");
    if (!amount) return;
    try {
      await api.contributeToPublicWork(workId, { COINS: parseInt(amount) });
      showToast('Contribution sent!', 'success');
      fetchCouncil();
    } catch (e: any) {
      showToast(e.message || 'Failed to contribute', 'error');
    }
  };

  const handleKick = async (userId: string) => {
    if (!await gameModal.confirm('Are you sure you want to kick this member?')) return;
    try {
      await api.kickCouncilMember(userId);
      fetchCouncil();
    } catch (e: any) {
      gameModal.error(e.message || 'Failed to kick');
    }
  };

  const handlePromote = async (userId: string) => {
    if (!await gameModal.confirm('Promote this member to Steward? You will be demoted.')) return;
    try {
      await api.promoteCouncilMember(userId);
      fetchCouncil();
    } catch (e: any) {
      gameModal.error(e.message || 'Failed to promote');
    }
  };

  const handleCreateWork = async () => {
    const name = prompt("Project Name:");
    if (!name) return;
    const coins = prompt("Cost in Coins:", "1000");
    if (!coins) return;
    
    try {
      await api.createPublicWork({
        projectCode: 'custom_' + Date.now(),
        name,
        requiredResources: { COINS: parseInt(coins) }
      });
      fetchCouncil();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  if (loading) return <LoadingScreen message="Loading Council..." />;
  
  if (!data?.council) {
    return (
      <div className="flex justify-center items-center" style={{ height: '100%' }}>
        <div className="flex-col gap-lg" style={{ maxWidth: '500px', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem' }}>Council</h1>
            <p style={{ color: '#aaa' }}>You are not part of a council. Join one or create your own.</p>
          </div>
          
          <GameCard title="Create Council">
            <div className="flex-col gap-md">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name</label>
                <GameInput fullWidth value={createName} onChange={e => setCreateName(e.target.value)} placeholder="My Council" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Archetype</label>
                <GameSelect fullWidth value={createCode} onChange={e => setCreateCode(e.target.value)}>
                  <option value="merchants_guild">Merchants Guild (Trade Focus)</option>
                  <option value="warriors_guild">Warriors Guild (Military Focus)</option>
                  <option value="scholars_guild">Scholars Guild (Tech Focus)</option>
                </GameSelect>
              </div>
              <GameButton fullWidth variant="green" onClick={handleCreate}>Create (Lvl 10 Required)</GameButton>
            </div>
          </GameCard>

          <GameCard title="Join Council">
            <div className="flex-col gap-md">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Council ID</label>
                <GameInput fullWidth value={joinId} onChange={e => setJoinId(e.target.value)} placeholder="UUID" />
              </div>
              <GameButton fullWidth variant="blue" onClick={handleJoin}>Join</GameButton>
            </div>
          </GameCard>
        </div>
      </div>
    );
  }

  const isSteward = data.council.steward_user_id === api.getUserId();

  return (
    <div className="flex-col gap-md" style={{ height: '100%' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 style={{ margin: 0, color: 'var(--color-gold)' }}>{data.council.name}</h1>
          <p style={{ color: '#aaa', margin: '0.25rem 0 0 0' }}>
            Prestige: <span style={{ color: 'white' }}>{data.council.prestige_score || 0}</span> | 
            Members: <span style={{ color: 'white' }}>{data.members.length}</span>
          </p>
        </div>
        <div className="flex gap-sm">
          {['overview', 'members', 'treasury', 'works'].map((tab) => (
            <GameButton 
              key={tab}
              variant={activeTab === tab ? 'blue' : 'gray'} 
              onClick={() => setActiveTab(tab as any)}
              size="sm"
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </GameButton>
          ))}
        </div>
      </div>

      <div className="flex gap-lg" style={{ flex: 1, minHeight: 0 }}>
        {/* Main Content Area */}
        <GameCard className="flex-col" style={{ flex: 2, overflowY: 'auto', background: 'rgba(0,0,0,0.2)' }}>
          {activeTab === 'overview' && (
            <div className="flex-col gap-md">
              <h2 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Tech Tree</h2>
              <div className="flex-col gap-md">
                {tech.map(t => (
                  <div key={t.code} style={{ 
                    border: '1px solid var(--color-border)', 
                    padding: '1rem', 
                    background: t.status === 'completed' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '8px'
                  }}>
                    <div className="flex justify-between items-center mb-2">
                      <strong style={{ color: t.status === 'completed' ? 'var(--color-success)' : 'var(--color-text-highlight)' }}>
                        {t.name} (Tier {t.tier})
                      </strong>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        background: t.status === 'active' ? 'var(--color-info)' : '#333' 
                      }}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '1rem' }}>{t.description}</p>
                    {t.status === 'active' && (
                      <div>
                        <div style={{ height: '8px', background: '#333', borderRadius: '4px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                           <div style={{ width: `${t.progress}%`, height: '100%', background: 'var(--color-gold)' }}></div>
                        </div>
                        <GameButton size="sm" variant="yellow" onClick={() => handleContributeTech(t.code)}>Contribute Coins</GameButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="flex-col gap-md">
              <h2 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Members</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#aaa', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Name</th>
                    <th>Role</th>
                    <th>Joined</th>
                    {isSteward && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((m: any) => (
                    <tr key={m.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold' }}>{m.username}</td>
                      <td>
                        <span style={{ 
                          color: m.role === 'steward' ? 'var(--color-gold)' : 'inherit' 
                        }}>
                          {m.role}
                        </span>
                      </td>
                      <td style={{ opacity: 0.7 }}>{new Date(m.joined_at).toLocaleDateString()}</td>
                      {isSteward && m.user_id !== api.getUserId() && (
                        <td className="flex gap-sm">
                          <GameButton size="sm" variant="red" onClick={() => handleKick(m.user_id)}>Kick</GameButton>
                          <GameButton size="sm" variant="green" onClick={() => handlePromote(m.user_id)}>Promote</GameButton>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'treasury' && (
            <div className="flex-col gap-md">
              <h2 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Treasury</h2>
              <div style={{ 
                background: 'linear-gradient(45deg, rgba(0,0,0,0.5), rgba(184, 134, 11, 0.2))', 
                padding: '2rem', 
                borderRadius: '8px', 
                border: '1px solid var(--color-gold-dim)',
                textAlign: 'center'
              }}>
                <h3 style={{ fontSize: '2rem', color: 'var(--color-gold)', margin: '0 0 1rem 0' }}>{data.council.treasury_balance} Coins</h3>
                <p style={{ fontSize: '1.2rem' }}>Tax Rate: <span style={{ fontWeight: 'bold' }}>{(data.council.tax_rate * 100).toFixed(1)}%</span></p>
                
                {isSteward && (
                  <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '1rem' }}>Adjust Tax Rate (0-5%)</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="0.1" 
                      defaultValue={(data.council.tax_rate * 100)}
                      onChange={(e) => api.setCouncilTaxRate(parseFloat(e.target.value) / 100)}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'works' && (
            <div className="flex-col gap-md">
              <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                <h2 style={{ margin: 0 }}>Public Works</h2>
                {isSteward && <GameButton size="sm" onClick={handleCreateWork}>+ New Project</GameButton>}
              </div>
              
              <div className="flex-col gap-md">
                {data.publicWorks?.map((w: any) => (
                  <div key={w.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--color-gold)' }}>{w.name}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span>Status: {w.status}</span>
                      <span style={{ opacity: 0.7 }}>Required: {JSON.stringify(JSON.parse(w.required_resources_json))}</span>
                    </div>
                    {w.status === 'active' && (
                      <GameButton fullWidth variant="blue" onClick={() => handleContributeWork(w.id)}>Contribute Coins</GameButton>
                    )}
                  </div>
                ))}
                {(!data.publicWorks || data.publicWorks.length === 0) && <p style={{ opacity: 0.5, textAlign: 'center' }}>No active projects.</p>}
              </div>
            </div>
          )}
        </GameCard>

        {/* Chat Panel */}
        <div className="flex-col" style={{ flex: 1, maxWidth: '350px', borderLeft: '1px solid var(--color-border)', background: 'rgba(0,0,0,0.4)' }}>
          <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: 0 }}>Council Chat</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {chat.map(m => (
              <div key={m.id} style={{ fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--color-gold)' }}>{m.username}: </strong> 
                <span style={{ color: '#ddd' }}>{m.message}</span>
              </div>
            ))}
          </div>
          
          <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <div className="flex gap-sm">
              <GameInput 
                fullWidth 
                value={msg} 
                onChange={e => setMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Type..."
              />
              <GameButton size="sm" variant="blue" onClick={handleSend}>Send</GameButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
