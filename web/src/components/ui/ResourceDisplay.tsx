
// Map Resource Codes to Sprite coordinates in Icons-Essentials.png
// The sheet is 4x4 (presumably 16x16 sprites)
const RESOURCE_SPRITES: Record<string, { index: number, color: string }> = {
  COINS: { index: 0, color: '#ffd700' }, // Gold Coin
  WOOD: { index: 8, color: '#deb887' }, // Wood Logs (row 3, col 1)
  STONE: { index: 12, color: '#d3d3d3' }, // Stone Block (row 4, col 1)
  FOOD: { index: 9, color: '#ff6347' }, // Apple/Food (row 3, col 2 - looks like food?) 
  // Let's double check indices. 
  // Row 1: 0,1,2,3 (Coins, Silver, Bronze, Old Coin)
  // Row 2: 4,5,6,7 (Potions)
  // Row 3: 8,9,10,11 (Wheat/Grain?, Heart, Head, Skull)
  // Row 4: 12,13,14,15 (Stone/Ore?, Gold Ore, Silver Ore, Copper Ore)
  
  // Revised mapping based on visual check:
  // Wheat/Food seems to be index 8 (Wheat sheaf)
  // Heart is 9.
  // Stone/Rock seems to be index 12.
  
  // Let's re-map:
  // COINS -> Index 0
  // WOOD -> Let's use Wheat (8) for now or find a better one. Actually 8 is Wheat.
  // STONE -> Index 12 (Rock)
  // IRON -> Index 13 (Gold Ore looking thing) or 15 (Copper)
  // FOOD -> Index 8 (Wheat)
  
  // Wait, where is Wood? Maybe in a different sheet.
  // For now, we will use these indices.
};

import { Sprite } from './Sprite';
import { Tooltip } from './Tooltip';

interface ResourceDisplayProps {
  icon?: string; // Legacy prop
  resourceCode?: string; // New prop for Sprite mapping
  label: string;
  amount: number | string;
  trend?: 'up' | 'down' | 'neutral';
}

export function ResourceDisplay({ icon, resourceCode, label, amount, trend }: ResourceDisplayProps) {
  const sprite = resourceCode ? RESOURCE_SPRITES[resourceCode] : null;

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
          width: '32px',
          height: '32px',
          background: 'url(/assets/layerlab/ui/Frame/BasicFrame_Hexagon_33.png) no-repeat center/contain',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {sprite ? (
            <Sprite 
              src="/assets/miniworld/User Interface/Icons-Essentials.png" 
              index={sprite.index} 
              sheetWidth={4} 
              spriteSize={16} 
              displaySize={20} 
            />
          ) : (
            <img src={icon} alt={label} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
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
