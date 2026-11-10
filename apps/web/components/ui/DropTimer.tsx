'use client';

import { Fragment, useEffect, useState } from 'react';

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
 * Counts down to the next weekly drop (design/Main.html, docs/product-spec.md section 7). Uses the
 * server clock offset so the timer is identical across devices; shows seconds only in the final
 * hour, and the "landing" state while the drop is being computed.
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
        className="rounded-[24px] border border-[#3A2C8F] px-4 py-6 text-center text-sm font-semibold text-ink-2"
        style={{ background: 'var(--grad-timer)' }}
      >
        Your week is landing…
      </div>
    );
  }

  const { days, hours, minutes, seconds } = parts(remaining);
  const lastHour = remaining <= 3600_000;
  const units: Array<[string, number]> = lastHour
    ? [
        ['Hours', hours],
        ['Minutes', minutes],
        ['Seconds', seconds],
      ]
    : [
        ['Days', days],
        ['Hours', hours],
        ['Minutes', minutes],
      ];

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[24px] border border-[#3A2C8F] px-3 py-[18px]"
      style={{ background: 'var(--grad-timer)' }}
    >
      <div className="font-head text-[13px] font-bold tracking-[0.08em]">NEXT DROP IN</div>
      <div className="flex items-start gap-2">
        {units.map(([label, value], idx) => (
          <Fragment key={label}>
            {idx > 0 && (
              <div className="font-head text-2xl font-bold leading-[54px]" aria-hidden="true">
                :
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex gap-[5px]">
                {String(value)
                  .padStart(2, '0')
                  .split('')
                  .map((digit, di) => (
                    <div
                      key={di}
                      className="flex h-[54px] w-11 items-center justify-center rounded-xl font-head text-[26px] font-bold tabular-nums"
                      style={{ background: 'linear-gradient(160deg, #1F4BFF 0%, #6A3DFF 100%)' }}
                    >
                      {digit}
                    </div>
                  ))}
              </div>
              <div className="text-xs text-[#C7CBD6]">{label}</div>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
