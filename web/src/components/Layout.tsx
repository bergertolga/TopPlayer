import { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/ApiClient';
import { QuestLog } from './QuestLog';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuests, setShowQuests] = useState(false);
  const [crowns, setCrowns] = useState<number | null>(null);

  const handleLogout = () => {
    api.logout();
    setCrowns(null);
    navigate('/login');
  };

  const navSections = useMemo(() => ([
    {
      label: 'City',
      items: [
        { path: '/', label: 'City' },
      ],
    },
    {
      label: 'Realm',
      items: [
        { path: '/capital', label: 'Capital' },
        { path: '/market', label: 'Market' },
        { path: '/map', label: 'Map' },
        { path: '/events', label: 'Events' },
        { path: '/combat', label: 'Combat' },
      ],
    },
    {
      label: 'Social',
      items: [
        { path: '/council', label: 'Council' },
        { path: '/social', label: 'World Chat' },
      ],
    },
    {
      label: 'Shop',
      items: [
        { path: '/shop', label: 'Premium Shop' },
      ],
    },
    {
      label: 'Account',
      items: [
        { path: '/profile', label: 'Profile' },
        { path: '/account', label: 'Account' },
      ],
    },
  ]), []);

  useEffect(() => {
    const userId = api.getUserId();
    if (!userId) {
      setCrowns(null);
      return;
    }
    api.getPremiumBalance()
      .then((res) => setCrowns(res.crowns ?? 0))
      .catch(() => setCrowns(null));
  }, [location.pathname]);

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0b1020, #0a0d14 45%, #0d111d)', 
      position: 'relative'
    }}>
      {/* Sidebar */}
      <aside style={{ 
        width: 'var(--sidebar-width)', 
        background: 'rgba(7, 10, 18, 0.95)', 
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 10,
        position: 'relative'
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
        
        <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {navSections.map((section) => (
            <div key={section.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontSize: '0.75rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#7f8699', padding: '0 0.25rem' }}>
                {section.label}
              </div>
              {section.items.map(item => {
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: isActive ? 'var(--color-gold)' : 'var(--color-text)',
                      background: isActive ? 'linear-gradient(90deg, rgba(243,199,124,0.16), rgba(243,199,124,0.05))' : 'rgba(255,255,255,0.02)',
                      border: isActive ? '1px solid var(--color-border)' : '1px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: isActive ? 'var(--color-gold)' : '#6b7383', display: 'inline-block' }} />
                    <span style={{ fontWeight: isActive ? 'bold' : 'normal' }}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1, padding: '1.5rem' }}>
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
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ padding: '0.4rem 0.75rem', borderRadius: 16, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--color-gold)', fontWeight: 700 }}>
              {crowns !== null ? `${crowns} Crowns` : '...'}
            </div>
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
            <Link 
              to="/shop"
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(90deg, #f3c77c, #d49a3a)',
                color: '#0b0f19',
                borderRadius: 20,
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
              }}
            >
              Shop
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
          <main style={{ 
            flex: 1,
            maxWidth: 'var(--panel-max-width)',
            width: '100%',
            position: 'relative',
            padding: '1.5rem 0 2rem 0',
          }}>
            <Outlet />
          </main>
        </div>
      </div>

      {showQuests && <QuestLog onClose={() => setShowQuests(false)} />}
    </div>
  );
}
