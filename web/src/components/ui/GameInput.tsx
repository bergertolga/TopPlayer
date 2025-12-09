
import React from 'react';

interface GameInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fullWidth?: boolean;
}

export function GameInput({ fullWidth, style, ...props }: GameInputProps) {
  return (
    <div style={{ 
      position: 'relative', 
      width: fullWidth ? '100%' : 'auto',
      display: 'inline-block'
    }}>
      <input
        {...props}
        style={{
          width: fullWidth ? '100%' : 'auto',
          padding: '10px 12px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--color-border)',
          borderBottom: '2px solid var(--color-gold-dim)',
          borderRadius: '4px',
          color: 'var(--color-text-highlight)',
          fontSize: '1rem',
          fontFamily: 'var(--font-body)',
          outline: 'none',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box', // Ensure padding doesn't break width
          ...style,
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--color-gold)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
      />
    </div>
  );
}

interface GameSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  fullWidth?: boolean;
}

export function GameSelect({ fullWidth, style, children, ...props }: GameSelectProps) {
  return (
    <div style={{ 
      position: 'relative', 
      width: fullWidth ? '100%' : 'auto',
      display: 'inline-block'
    }}>
      <select
        {...props}
        style={{
          width: fullWidth ? '100%' : 'auto',
          padding: '10px 12px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--color-border)',
          borderBottom: '2px solid var(--color-gold-dim)',
          borderRadius: '4px',
          color: 'var(--color-text-highlight)',
          fontSize: '1rem',
          fontFamily: 'var(--font-body)',
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none', // Hide default arrow
          backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFD700%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right .7em top 50%',
          backgroundSize: '.65em auto',
          paddingRight: '2.5em',
          boxSizing: 'border-box',
          ...style,
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--color-gold)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
      >
        {children}
      </select>
    </div>
  );
}



