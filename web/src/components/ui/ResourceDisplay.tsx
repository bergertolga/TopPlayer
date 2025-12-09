
import { Tooltip } from './Tooltip';

interface ResourceDisplayProps {
  icon?: string; // Legacy prop
  resourceCode?: string; // New prop for Sprite mapping
  label: string;
  amount: number | string;
  trend?: 'up' | 'down' | 'neutral';
}

export function ResourceDisplay({ icon, resourceCode, label, amount, trend }: ResourceDisplayProps) {
  const colorMap: Record<string, string> = {
    COINS: '#f2c94c',
    WOOD: '#d7a86e',
    STONE: '#9aa4b5',
    FOOD: '#f08a5d',
    PLANKS: '#a3d2ca',
    FABRIC: '#c3aed6',
  };
  const resolvedIcon = resourceCode ? null : icon;

  return (
    <Tooltip text={`${label}: ${amount}`}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        background: 'rgba(0, 0, 0, 0.5)',
        padding: '4px 12px 4px 4px',
        borderRadius: '20px',
        border: '1px solid var(--color-border)',
        minWidth: '100px',
        cursor: 'help'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: 999,
          background: resourceCode ? (colorMap[resourceCode] || '#888') : '#888',
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: '0 0 6px rgba(0,0,0,0.4)',
        }}>
          {resolvedIcon && (
            <img src={resolvedIcon} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ fontSize: '0.7rem', color: '#aaa', textTransform: 'uppercase' }}>{label}</span>
          <span style={{ 
            fontSize: '0.9rem', 
            fontWeight: 'bold', 
            color: trend === 'down' ? '#ff6b6b' : 'var(--color-text-highlight)'
          }}>
            {amount}
          </span>
        </div>
      </div>
    </Tooltip>
  );
}
