
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

  return (
    <div 
      className={className}
      style={{
        width: displaySize,
        height: displaySize,
        backgroundImage: `url(${src})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: `-${x}px -${y}px`,
        backgroundSize: `auto`, // We rely on the image being 1:1 scale pixel art, or we can scale it:
        // For pixel art, we usually want to scale the whole sheet up. 
        // If displaySize != spriteSize, we need to scale.
        // A simpler way for pixel art scaling is `image-rendering: pixelated` and using `transform: scale()` or sizing the background.
        
        // Approach B: Sizing the background relative to the sprite size
        // If the sheet is 160px wide (10 sprites) and we want 32px sprites (2x zoom), 
        // the background size needs to be 320px.
        // But we don't know the total sheet dimensions easily without loading it.
        
        // Approach C: Use a container with overflow hidden and an inner img (or div) that is transformed.
        // Let's stick to Approach A (standard CSS sprite) but assume the asset is pre-scaled OR we rely on native size.
        // Most MiniWorld assets are small (16x16). If we want to display them at 32x32, we should probably use `transform`.
        
        imageRendering: 'pixelated',
        // To scale up 16x16 to 32x32 without knowing sheet size:
        // We can use `transform: scale(2)` on an inner div, or just zoom.
        // Let's try a cleaner approach: assume we want to render at native resolution but scaled via CSS transform if needed?
        // No, that messes up layout.
        
        // Let's assume we can just zoom the background using background-size? 
        // background-size: N * displaySize/spriteSize
        // Requires knowing N (sprites per row).
        // Let's try to keep it simple: 
        // We assume the sheet is loaded at its native resolution (e.g. 16x16 grids).
        // We display it in a 32x32 box.
        // We need to scale the background image by (displaySize / spriteSize).
        // But `background-size` needs total width.
        
        // Alternative: "Zoom" prop.
        ...style
      }}
    >
      <div style={{
        width: '100%',
        height: '100%',
        backgroundImage: `url(${src})`,
        backgroundPosition: `-${x}px -${y}px`,
        imageRendering: 'pixelated',
        // Trick to scale up:
        transform: `scale(${displaySize / spriteSize})`,
        transformOrigin: 'top left',
        // This requires the container to be the original size, then we scale? 
        // No, better:
      }} />
    </div>
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

