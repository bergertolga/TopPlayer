
import React from 'react';

type ButtonVariant = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  blue: '/assets/layerlab/ui/Button/Button_Rectangle_01_Convex_Blue.Png',
  green: '/assets/layerlab/ui/Button/Button_Rectangle_01_Convex_Green.Png',
  red: '/assets/layerlab/ui/Button/Button_Rectangle_01_Convex_Red.Png',
  yellow: '/assets/layerlab/ui/Button/Button_Rectangle_01_Convex_Yellow.Png',
  purple: '/assets/layerlab/ui/Button/Button_Rectangle_01_Convex_Purple.Png',
  gray: '/assets/layerlab/ui/Button/Button_Rectangle_01_Convex_Gray.Png',
};

export function GameButton({ 
  children, 
  variant = 'blue', 
  size = 'md', 
  fullWidth = false,
  className,
  style,
  disabled,
  ...props 
}: GameButtonProps) {
  const bgImage = disabled ? VARIANTS.gray : VARIANTS[variant];
  
  const sizeStyles = {
    sm: { padding: '8px 16px', fontSize: '0.8rem' },
    md: { padding: '12px 24px', fontSize: '1rem' },
    lg: { padding: '16px 32px', fontSize: '1.2rem' },
  };

  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        background: `url(${bgImage}) no-repeat center/100% 100%`,
        border: 'none',
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        fontWeight: 'bold',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.8 : 1,
        width: fullWidth ? '100%' : 'auto',
        minWidth: '100px', // Prevent squishing
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.1s',
        ...sizeStyles[size],
        ...style,
      }}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.95)')}
      onMouseUp={(e) => !disabled && (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {children}
    </button>
  );
}


