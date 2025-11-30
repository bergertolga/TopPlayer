import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/ApiClient';
import { QuestLog } from './QuestLog';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuests, setShowQuests] = useState(false);

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'City', icon: '🏰' },
    { path: '/capital', label: 'Capital', icon: '🏛️' },
    { path: '/market', label: 'Market', icon: '💰' },
    { path: '/map', label: 'Map', icon: '🗺️' },
    { path: '/council', label: 'Council', icon: '📜' },
    { path: '/events', label: 'Events', icon: '🎉' },
    { path: '/combat', label: 'Combat', icon: '⚔️' },
    { path: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      backgroundImage: 'url(/assets/layerlab/backgrounds/Background_01.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      {/* Sidebar */}
      <aside style={{ 
        width: 'var(--sidebar-width)', 
        background: 'rgba(0, 0, 0, 0.85)', 
        borderRight: '2px solid var(--color-gold-dim)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10
      }}>
        <div style={{ 
          padding: '1.5rem', 
          textAlign: 'center', 
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            color: 'var(--color-gold)',
            textShadow: '0 2px 4px black'
          }}>TopPlayer</h1>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-gold)' : 'var(--color-text)',
                    background: isActive ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                    border: isActive ? '1px solid var(--color-gold-dim)' : '1px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'var(--color-danger)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ 
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(4px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button 
            onClick={() => setShowQuests(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}
          >
            <span>📜</span> Quests
          </button>
        </header>

        {/* Page Content */}
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '2rem',
          position: 'relative'
        }}>
          <Outlet />
        </main>
      </div>

      {showQuests && <QuestLog onClose={() => setShowQuests(false)} />}
    </div>
  );
}
