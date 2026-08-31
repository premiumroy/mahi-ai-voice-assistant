/**
 * MicButton
 * The central power / mic button.
 */
import { memo } from 'react';
import type { SessionState } from '../types';

interface MicButtonProps {
  state: SessionState;
  onClick: () => void;
}

function MicIcon({ state }: { state: SessionState }) {
  if (state === 'disconnected') {
    return (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v10" /><path d="M18.4 6.6a9 9 0 0 1 0 10.8" /><path d="M5.6 6.6a9 9 0 0 0 0 10.8" /><path d="M5.64 13.95a9 9 0 0 0 12.72 0" /><path d="M12 19v3" />
      </svg>
    );
  }
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" />
    </svg>
  );
}

const STATE_STYLES: Record<SessionState, string> = {
  disconnected: 'border-white/20 text-white/70 hover:border-mahi-accent hover:text-mahi-accent',
  connecting: 'border-mahi-accent text-mahi-accent animate-pulse-glow',
  listening: 'border-mahi-accent text-mahi-accent animate-pulse-glow',
  speaking: 'border-mahi-accent2 text-mahi-accent2 animate-pulse-glow',
  error: 'border-red-500/60 text-red-400 hover:border-red-500',
};

function MicButtonBase({ state, onClick }: MicButtonProps) {
  const isActive = state !== 'disconnected';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isActive ? 'Stop session' : 'Start session'}
      aria-pressed={isActive}
      className={`relative grid h-28 w-28 place-items-center rounded-full border-2 bg-mahi-surface/80 backdrop-blur-md transition-all duration-300 active:scale-95 ${STATE_STYLES[state]}`}
    >
      {state === 'connecting' && (
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-mahi-accent animate-spin-slow" aria-hidden />
      )}
      {isActive && state !== 'connecting' && (
        <span
          className="absolute inset-0 rounded-full blur-xl"
          style={{
            background: state === 'speaking'
              ? 'radial-gradient(circle, rgba(236,72,153,0.35), transparent 70%)'
              : 'radial-gradient(circle, rgba(168,85,247,0.35), transparent 70%)',
          }}
          aria-hidden
        />
      )}
      <span className="relative z-10"><MicIcon state={state} /></span>
    </button>
  );
}

export const MicButton = memo(MicButtonBase);
