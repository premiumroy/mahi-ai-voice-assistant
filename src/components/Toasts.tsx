/**
 * Toasts
 * Small, auto-dismissing transient messages.
 */
import { memo } from 'react';
import type { Toast } from '../types';

interface ToastsProps {
  toasts: Toast[];
}

function ToastsBase({ toasts }: ToastsProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-10 z-20 flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-scale-in pointer-events-auto rounded-full px-4 py-2 text-sm backdrop-blur-md ${
            t.kind === 'action'
              ? 'bg-mahi-accent2/20 text-mahi-accent2 ring-1 ring-mahi-accent2/40'
              : 'bg-white/10 text-white/80 ring-1 ring-white/15'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

export const Toasts = memo(ToastsBase);
