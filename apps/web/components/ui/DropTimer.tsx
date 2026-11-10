'use client';

import { useEffect, useState } from 'react';

interface DropTimerProps {
  /** ISO timestamp of the next drop. */
  nextDropAt: string;
  /** ISO server time at render, used to offset the client clock. */
  serverNow: string;
  dropInProgress?: boolean;
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Counts down to the next weekly drop (docs/product-spec.md section 7). Uses the server clock
 * offset so the timer is identical across devices; shows seconds only in the final hour, and the
 * "landing" state while the drop is being computed.
 */
export function DropTimer({ nextDropAt, serverNow, dropInProgress }: DropTimerProps) {
  const target = new Date(nextDropAt).getTime();
  const offset = Date.now() - new Date(serverNow).getTime();
  const [remaining, setRemaining] = useState(() => target - (Date.now() - offset));

  useEffect(() => {
    const tick = () => setRemaining(target - (Date.now() - offset));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, offset]);

  if (dropInProgress) {
    return (
      <div
        className="rounded-panel border border-[#3A2C8F] px-4 py-3 text-center text-sm font-semibold text-ink-2"
        style={{ background: 'var(--grad-timer)' }}
      >
        Your week is landing…
      </div>
    );
  }

  const { days, hours, minutes, seconds } = parts(remaining);
  const lastHour = remaining <= 3600_000;
  const tiles: Array<[string, number]> = lastHour
    ? [
        ['H', hours],
        ['M', minutes],
        ['S', seconds],
      ]
    : [
        ['D', days],
        ['H', hours],
        ['M', minutes],
      ];

  return (
    <div
      className="flex items-center justify-center gap-2 rounded-panel border border-[#3A2C8F] px-4 py-3"
      style={{ background: 'var(--grad-timer)' }}
    >
      {tiles.map(([unit, value]) => (
        <div key={unit} className="flex min-w-14 flex-col items-center">
          <span className="font-head text-2xl font-bold tabular-nums">
            {String(value).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-ink-3">{unit}</span>
        </div>
      ))}
    </div>
  );
}
