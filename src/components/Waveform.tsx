/**
 * Waveform
 * A reactive ring of bars around the mic button.
 */
import { memo, useMemo } from 'react';

interface WaveformProps {
  level: number;
  speaking: boolean;
  active: boolean;
}

const BAR_COUNT = 48;

function WaveformBase({ level, speaking, active }: WaveformProps) {
  const bars = useMemo(() => Array.from({ length: BAR_COUNT }, (_, i) => i), []);
  const intensity = Math.min(1, level * 1.6);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <div className="relative h-[320px] w-[320px]" style={{ opacity: active ? 1 : 0.25 }}>
        {bars.map((i) => {
          const angle = (i / BAR_COUNT) * 360;
          const base = 6 + (i % 5) * 3;
          const height = active ? base + intensity * (38 + (i % 7) * 4) : base;
          const color = speaking ? '#ec4899' : '#a855f7';
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 origin-bottom"
              style={{
                width: '3px',
                height: `${height}px`,
                background: color,
                borderRadius: '9999px',
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-150px)`,
                opacity: active ? 0.5 + intensity * 0.5 : 0.3,
                boxShadow: active ? `0 0 8px ${color}` : 'none',
                transition: 'height 90ms ease-out, opacity 90ms ease-out',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export const Waveform = memo(WaveformBase);
