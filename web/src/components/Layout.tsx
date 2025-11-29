
import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../services/ApiClient';
import { QuestLog } from './QuestLog';

export function Layout() {
  const navigate = useNavigate();
  const [showQuests, setShowQuests] = useState(false);

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem' }}>TopPlayer Web</h1>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/">City</Link>
          <Link to="/capital">Capital</Link>
          <Link to="/market">Market</Link>
          <Link to="/map">Map</Link>
          <Link to="/council">Council</Link>
          <Link to="/events">Events</Link>
          <Link to="/combat">Combat</Link>
          <Link to="/profile">Profile</Link>
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1rem' }}>
          <button onClick={() => setShowQuests(true)}>Quests</button>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        <Outlet />
      </main>
      {showQuests && <QuestLog onClose={() => setShowQuests(false)} />}
    </div>
  );
}

