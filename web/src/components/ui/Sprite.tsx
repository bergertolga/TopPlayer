
import React from 'react';

interface SpriteProps {
  src: string;
  index?: number; // 0-based index of the sprite in the sheet (LTR, TTB)
  row?: number;   // OR specify row/col directly
  col?: number;
  sheetWidth?: number; // Number of sprites per row
  spriteSize?: number; // Size of one sprite in px (default 16)
  displaySize?: number; // Rendered size in px
  className?: string;
  style?: React.CSSProperties;
}

export function Sprite({ 
  src, 
  index = 0, 
  row, 
  col, 
  sheetWidth = 10, // Default assumption, override per sheet
  spriteSize = 16, 
  displaySize = 32, 
  className, 
  style 
}: SpriteProps) {
  
  let x = 0;
  let y = 0;

  if (row !== undefined && col !== undefined) {
    x = col * spriteSize;
    y = row * spriteSize;
  } else {
    const r = Math.floor(index / sheetWidth);
    const c = index % sheetWidth;
    x = c * spriteSize;
    y = r * spriteSize;
  }

  const scale = displaySize / spriteSize;
  const bgSizeWidth = sheetWidth * displaySize;

  return (
    <div 
      className={className}
      style={{
        width: displaySize,
        height: displaySize,
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `-${x * scale}px -${y * scale}px`,
        backgroundSize: `${bgSizeWidth}px auto`,
        imageRendering: 'pixelated',
        ...style
      }}
    />
  );
}

// Revised Sprite Component for easier scaling
export function PixelSprite({ 
  src, 
  x = 0, 
  y = 0, 
  size = 16, 
  scale = 2, 
  style 
}: { src: string, x?: number, y?: number, size?: number, scale?: number, style?: React.CSSProperties }) {
  return (
    <div style={{
      width: size * scale,
      height: size * scale,
      overflow: 'hidden',
      position: 'relative',
      ...style
    }}>
      <img 
        src={src} 
        style={{
          position: 'absolute',
          left: -x * size * scale,
          top: -y * size * scale,
          width: 'auto',
          maxWidth: 'none',
          height: 'auto',
          imageRendering: 'pixelated',
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }} 
      />
    </div>
  );
}


