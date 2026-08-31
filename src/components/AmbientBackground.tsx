/**
 * AmbientBackground
 * The dark, futuristic gradient backdrop with two slow-floating glow orbs.
 */
import { memo } from 'react';

function AmbientBackgroundBase() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-mahi-bg">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="absolute -left-20 top-1/4 h-72 w-72 rounded-full opacity-40 blur-[100px]"
        style={{ background: '#7c3aed', animation: 'pulse-glow 6s ease-in-out infinite' }}
      />
      <div
        className="absolute -right-16 bottom-1/4 h-80 w-80 rounded-full opacity-30 blur-[120px]"
        style={{ background: '#ec4899', animation: 'pulse-glow 7s ease-in-out infinite 1s' }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/40 to-transparent" />
    </div>
  );
}

export const AmbientBackground = memo(AmbientBackgroundBase);
