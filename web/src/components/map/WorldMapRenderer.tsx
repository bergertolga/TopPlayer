
import { useState, useMemo } from 'react';
import { Sprite } from '../ui/Sprite';
import { generateWorldMap, type MapTile, MAP_WIDTH, MAP_HEIGHT } from '../../utils/MapGenerator';

interface WorldMapRendererProps {
  onRegionSelect: (regionId: string) => void;
  currentRegionId?: string;
}

const TILE_SIZE = 32; // Display size

export function WorldMapRenderer({ onRegionSelect, currentRegionId }: WorldMapRendererProps) {
  const tiles = useMemo(() => generateWorldMap(), []);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Group tiles by region for overlay logic? 
  // Or just render tiles and handle hover.

  const getTerrainSprite = (tile: MapTile) => {
    // Mapping to MiniWorld assets
    // Assuming we use "Ground/TexturedGrass.png" for Grass
    // "Ground/Shore.png" for Sand/Water?
    
    // Let's rely on basic sheets.
    // Grass: TexturedGrass.png
    // Water: Cliff-Water.png (or just blue tile)
    // Mountain: Cliff.png
    
    switch (tile.terrain) {
      case 'WATER':
        return '/assets/miniworld/Ground/Cliff-Water.png'; // Need to check if this is a sheet or single
      case 'SAND':
        return '/assets/miniworld/Ground/Shore.png';
      case 'MOUNTAIN':
        return '/assets/miniworld/Ground/Cliff.png';
      case 'SNOW':
        return '/assets/miniworld/Ground/Winter.png';
      case 'GRASS':
      default:
        return '/assets/miniworld/Ground/TexturedGrass.png';
    }
  };

  return (
    <div style={{
      width: MAP_WIDTH * TILE_SIZE,
      height: MAP_HEIGHT * TILE_SIZE,
      position: 'relative',
      margin: '0 auto',
      background: '#000',
      border: '4px solid var(--color-gold-dim)',
      boxShadow: '0 0 20px rgba(0,0,0,0.5)'
    }}
    onMouseLeave={() => setHoveredRegion(null)}
    >
      {tiles.map((tile, i) => {
        const isHovered = hoveredRegion === tile.regionId;
        const isCurrent = currentRegionId === tile.regionId;
        
        return (
          <div
            key={i}
            onClick={() => onRegionSelect(tile.regionId)}
            onMouseEnter={() => setHoveredRegion(tile.regionId)}
            style={{
              position: 'absolute',
              left: tile.x * TILE_SIZE,
              top: tile.y * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
              cursor: 'pointer',
              filter: isHovered ? 'brightness(1.2)' : 'none',
              transition: 'filter 0.1s'
            }}
          >
            <Sprite 
              src={getTerrainSprite(tile)} 
              // Most MiniWorld ground tiles are 3x3 sheets (autotile)
              // Let's pick center tile (1,1) for simplicity, or random
              row={1} 
              col={1} 
              sheetWidth={3} 
              spriteSize={16} 
              displaySize={TILE_SIZE} 
            />
            
            {/* Region Overlay Highlight */}
            {(isHovered || isCurrent) && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: isCurrent ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: isCurrent ? '1px solid rgba(255, 215, 0, 0.5)' : 'none',
                pointerEvents: 'none'
              }} />
            )}
          </div>
        );
      })}

      {/* Region Labels (Centered) */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        color: 'white',
        textShadow: '0 2px 4px black',
        fontWeight: 'bold',
        fontSize: '1.5rem',
        opacity: hoveredRegion === 'region-1' ? 1 : 0.5
      }}>
        Heartlands
      </div>
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        color: '#ff6b6b',
        textShadow: '0 2px 4px black',
        fontWeight: 'bold',
        opacity: hoveredRegion === 'region-2' ? 1 : 0.5
      }}>
        Borderlands
      </div>
       <div style={{
        position: 'absolute', top: '50%', right: '5%', transform: 'translate(0, -50%)',
        pointerEvents: 'none',
        color: '#4dabf7',
        textShadow: '0 2px 4px black',
        fontWeight: 'bold',
        opacity: hoveredRegion === 'region-3' ? 1 : 0.5
      }}>
        The Coast
      </div>
    </div>
  );
}

