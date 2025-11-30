import type { ReactNode, CSSProperties } from 'react';

interface GameCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  style?: CSSProperties;
}

export function GameCard({ children, title, className, style }: GameCardProps) {
  return (
    <div 
      className={className}
      style={{
        position: 'relative',
        padding: '20px',
        background: 'var(--color-bg-panel)', // Uses the new darker panel variable
        border: '1px solid var(--color-gold-dim)',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.5)',
        ...style
      }}
    >
      {/* Decorative corners could go here using absolute positioning and Frame assets */}
      
      {title && (
        <div style={{
          marginBottom: '1rem',
          borderBottom: '2px solid var(--color-gold-dim)',
          paddingBottom: '0.5rem',
          textAlign: 'center',
        }}>
          <h3 style={{ 
            margin: 0, 
            color: 'var(--color-gold)', 
            textShadow: '0 2px 2px black',
            fontSize: '1.3rem', // Slight bump
          }}>
            {title}
          </h3>
        </div>
      )}
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
