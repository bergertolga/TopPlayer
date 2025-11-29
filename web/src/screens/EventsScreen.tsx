
import { useEffect, useState } from 'react';
import { api } from '../services/ApiClient';
import type { GameEvent } from '../services/types';

export function EventsScreen() {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    api.getOverview().then(d => setEvents(d.events.active));
  }, []);

  return (
    <div>
      <h2>Active Events</h2>
      {events.length === 0 ? <p>No active events.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {events.map(e => (
            <li key={e.id} style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
              <h3>{e.name}</h3>
              <p>Type: {e.type} | Scope: {e.scope}</p>
              <p>Ends at: {new Date(e.end_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <hr />
      <h3>Leaderboards (Placeholder)</h3>
      <p>Rankings will appear here.</p>
    </div>
  );
}

