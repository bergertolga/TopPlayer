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
        background: 'var(--color-panel)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        boxShadow: '0 24px 42px rgba(0,0,0,0.5)',
        ...style
      }}
    >
      {/* Decorative corners could go here using absolute positioning and Frame assets */}
      
      {title && (
        <div style={{
          marginBottom: '1rem',
          borderBottom: '1px solid var(--color-gold-dim)',
          paddingBottom: '0.35rem',
          textAlign: 'left',
        }}>
          <h3 style={{ 
            margin: 0, 
            color: 'var(--color-gold)', 
            textShadow: '0 2px 2px black',
            fontSize: '1.2rem',
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
