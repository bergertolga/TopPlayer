
import { useState, useEffect } from 'react';
import { api } from '../services/ApiClient';

export function CapitalScreen() {
  const [state, setState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCapital = async () => {
    try {
      const data = await api.getCapitalState();
      setState(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapital();
  }, []);

  const handleFulfill = async (code: string) => {
    try {
      await api.fulfillCapitalRequest(code);
      fetchCapital(); // Refresh
    } catch (e) {
      alert('Failed to fulfill request');
    }
  };

  if (loading) return <div>Loading Capital...</div>;
  if (!state) return <div>Failed to load Capital</div>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1>The Capital</h1>
      
      <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h2>Throne Room</h2>
        <p><strong>King:</strong> {state.king?.name}</p>
        <p><strong>Announcement:</strong> {state.announcement?.body || 'Silence reigns.'}</p>
      </div>

      <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
        <h2>Your Standing</h2>
        <p>Tier: {state.tier?.name} (Rank {state.tier?.tier})</p>
        <p>Favor Points: {state.favor?.points || 0}</p>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h2>Royal Requests</h2>
        {state.requests?.length === 0 ? <p>No active requests.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {state.requests?.map((req: any) => (
              <div key={req.code} style={{ border: '1px solid #eee', padding: '0.5rem' }}>
                <h3>{req.name}</h3>
                <p>{req.description}</p>
                <p>Needs: {req.amount_required} {req.resource_code}</p>
                <button onClick={() => handleFulfill(req.code)}>Fulfill Request</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2>Royal Store</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {state.store?.map((item: any) => (
            <div key={item.code} style={{ border: '1px solid #eee', padding: '0.5rem' }}>
              <h4>{item.name}</h4>
              <p>Cost: {item.cost_favor > 0 ? `${item.cost_favor} Favor` : `${item.cost_coins} Coins`}</p>
              <button disabled>Purchase (Coming Soon)</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

