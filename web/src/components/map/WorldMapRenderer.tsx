
import { useState } from 'react';

interface WorldMapRendererProps {
  onRegionSelect: (regionId: string) => void;
  currentRegionId?: string;
}

const REGIONS = [
  { id: 'region-1', name: 'Heartlands', color: '#4caf50', desc: 'Balanced, safe start' },
  { id: 'region-2', name: 'Borderlands', color: '#f06292', desc: 'Risky, richer spoils' },
  { id: 'region-3', name: 'Coast', color: '#64b5f6', desc: 'Trade and fishing' },
];

export function WorldMapRenderer({ onRegionSelect, currentRegionId }: WorldMapRendererProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 960,
        aspectRatio: '16 / 9',
        margin: '0 auto',
        background: `url(/assets/layerlab/casual-game/preview/Stage_Select_Type2_Detail.png) center/cover no-repeat`,
        border: '4px solid var(--color-gold-dim)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
        overflow: 'hidden',
        borderRadius: '12px',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0.15), rgba(0,0,0,0.45))',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: '12% 8% 12% 8%',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          zIndex: 2,
        }}
      >
        {REGIONS.map((r) => {
          const active = currentRegionId === r.id;
          const isHover = hovered === r.id;
          return (
            <button
              key={r.id}
              onMouseEnter={() => setHovered(r.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onRegionSelect(r.id)}
              style={{
                padding: '1rem 1.2rem',
                textAlign: 'left',
                background: 'rgba(0,0,0,0.55)',
                border: active
                  ? '2px solid var(--color-gold)'
                  : '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                color: 'var(--color-text)',
                cursor: 'pointer',
                boxShadow: active
                  ? '0 0 18px rgba(247,210,108,0.35)'
                  : '0 10px 20px rgba(0,0,0,0.35)',
                transform: isHover ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'all 120ms ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: `linear-gradient(135deg, ${r.color}33, transparent)`,
                  opacity: 0.8,
                }}
              />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontWeight: 700,
                    color: r.color,
                    textShadow: '0 1px 2px black',
                  }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 999, background: r.color, boxShadow: '0 0 8px rgba(0,0,0,0.5)' }} />
                  {r.name}
                </div>
                <div style={{ marginTop: '0.35rem', color: '#d7e2ff', opacity: 0.9, fontSize: '0.95rem' }}>
                  {r.desc}
                </div>
                {active && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--color-gold)' }}>
                    Current region
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

