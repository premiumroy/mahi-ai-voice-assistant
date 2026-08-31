/**
 * StatusBar
 * The small status line above the mic button.
 */
import { memo } from 'react';
import type { SessionState } from '../types';

interface StatusBarProps {
  state: SessionState;
}

const COPY: Record<SessionState, { label: string; sub: string }> = {
  disconnected: { label: 'Tap to wake me up', sub: "I don't bite… much. 😏" },
  connecting: { label: 'Connecting…', sub: 'Hold on, fixing my hair.' },
  listening: { label: 'Listening', sub: "I'm all ears, go on." },
  speaking: { label: 'Speaking', sub: 'Shhh, my turn. 💁‍♀️' },
  error: { label: 'Something broke', sub: 'Tap to try again, maybe?' },
};

function StatusBarBase({ state }: StatusBarProps) {
  const { label, sub } = COPY[state];
  const dotColor = state === 'speaking' ? 'bg-mahi-accent2'
    : state === 'listening' ? 'bg-mahi-accent'
    : state === 'connecting' ? 'bg-yellow-400'
    : state === 'error' ? 'bg-red-500'
    : 'bg-white/30';

  return (
    <div className="animate-fade-in flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColor} ${state !== 'disconnected' && state !== 'error' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">{label}</span>
      </div>
      <span className="text-sm text-white/40">{sub}</span>
    </div>
  );
}

export const StatusBar = memo(StatusBarBase);
