
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/ApiClient';

export function LoginScreen() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      await api.login(username);
      navigate('/');
    } catch (e: any) {
      // If user not found, try register (auto-register for prototype convenience)
      try {
          await api.register(username);
          navigate('/');
      } catch (regErr: any) {
          setError(e.message);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '5rem' }}>
      <h1>TopPlayer Login</h1>
      <input 
        type="text" 
        placeholder="Username" 
        value={username} 
        onChange={e => setUsername(e.target.value)}
        style={{ padding: '0.5rem', marginBottom: '1rem' }}
      />
      <button onClick={handleLogin} style={{ padding: '0.5rem 2rem' }}>Play</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

