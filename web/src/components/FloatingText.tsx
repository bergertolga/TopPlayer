
import { useEffect, useState } from 'react';

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

let textListener: ((text: Omit<FloatingText, 'id'>) => void) | null = null;

export const floatingText = {
  show: (text: string, x: number, y: number, color = '#ffd700') => {
    if (textListener) {
      textListener({ text, x, y, color });
    }
  }
};

export function FloatingTextProvider() {
  const [texts, setText] = useState<FloatingText[]>([]);

  useEffect(() => {
    textListener = (newText) => {
      const id = Date.now() + Math.random();
      setText(prev => [...prev, { ...newText, id }]);
      setTimeout(() => {
        setText(prev => prev.filter(t => t.id !== id));
      }, 1000);
    };
    return () => { textListener = null; };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {texts.map(t => (
        <div
          key={t.id}
          style={{
            position: 'absolute',
            left: t.x,
            top: t.y,
            color: t.color,
            fontWeight: 'bold',
            fontSize: '1.2rem',
            textShadow: '0 2px 2px black',
            animation: 'floatUp 1s ease-out forwards'
          }}
        >
          {t.text}
        </div>
      ))}
      <style>
        {`
          @keyframes floatUp {
            0% { transform: translateY(0); opacity: 1; }
            100% { transform: translateY(-50px); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}


