export function LoadingScreen({ message = 'Loading Kingdom...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '300px',
      color: 'var(--color-gold)',
      gap: '1rem'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        border: '4px solid rgba(255, 255, 255, 0.1)',
        borderTop: '4px solid var(--color-gold)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <h2 style={{ margin: 0, textShadow: '0 2px 4px black' }}>{message}</h2>
    </div>
  );
}
