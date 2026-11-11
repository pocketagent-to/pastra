'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/cn';

const STEPS = ['Hours played', 'Games owned', 'Recent activity', 'Achievements', 'Account age'];

interface Progress {
  status: 'pending' | 'ok' | 'failed' | 'skipped';
  metricsFound: string[];
  done: boolean;
}

/** A8 · Building the pass — found metrics appear one by one (docs/product-spec.md section 12). */
function Building() {
  const search = useSearchParams();
  const connectionId = search.get('c');
  const [found, setFound] = useState(0);
  const [done, setDone] = useState(false);

  // No connection id: keep the original timed progressive-reveal visuals.
  useEffect(() => {
    if (connectionId || found >= STEPS.length) return;
    const id = setTimeout(() => setFound((n) => n + 1), 700);
    return () => clearTimeout(id);
  }, [connectionId, found]);

  // Connection id present: poll the real sync progress and reveal as metrics land.
  useEffect(() => {
    if (!connectionId || done) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/connections/${encodeURIComponent(connectionId)}/progress`, {
          cache: 'no-store',
        });
        if (!res.ok || !active) return;
        const p = (await res.json()) as Progress;
        if (!active) return;
        setFound((n) => Math.min(STEPS.length, Math.max(n, p.done ? STEPS.length : p.metricsFound.length)));
        if (p.done) setDone(true);
      } catch {
        /* ignore transient poll errors; the next tick retries */
      }
    };

    void poll();
    const id = setInterval(poll, 900);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [connectionId, done]);

  const pct = Math.round((found / STEPS.length) * 100);

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <header className="flex min-h-11 items-center gap-2.5 bg-panel px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">PASTRA</span>
      </header>

      <main className="flex flex-1 flex-col gap-6 px-5 pt-7 pb-6">
        <div className="flex flex-col items-start gap-2.5">
          <span className="rounded-[10px] bg-blue px-3.5 py-1.5 font-head text-[11px] font-bold tracking-[0.06em]">
            STEP 3 OF 3
          </span>
          <h1 className="font-head text-[26px] font-extrabold uppercase leading-[1.15]">
            Building your pass
          </h1>
        </div>

        <div className="flex flex-col gap-2">
          <div
            className="h-[14px] overflow-hidden rounded-[7px] bg-panel"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Building progress"
          >
            <div
              className="h-full rounded-[7px] bg-blue transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="font-head text-[13px] font-bold">{pct}%</div>
        </div>

        <div className="flex justify-center">
          <svg viewBox="-120 -120 240 240" width={210} height={210} aria-hidden="true">
            <polygon
              points="0,-105 90.9,-52.5 90.9,52.5 0,105 -90.9,52.5 -90.9,-52.5"
              fill="none"
              stroke="#3A3D47"
              strokeWidth={2}
            />
            <polygon
              points="0,-70 60.6,-35 60.6,35 0,70 -60.6,35 -60.6,-35"
              fill="none"
              stroke="#2A2C34"
              strokeWidth={2}
            />
            <polygon
              points="0,0 0,-8 62,-36 6,4"
              fill="#1F4BFF"
              fillOpacity={0.4}
              stroke="#5B82FF"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <circle cx={62} cy={-36} r={5} fill="#FF6B2C" />
          </svg>
        </div>

        <div className="flex flex-col rounded-panel bg-panel px-4 py-1.5">
          {STEPS.map((label, i) => {
            const isDone = i < found;
            return (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-3 py-[13px]',
                  i > 0 && 'border-t border-divider',
                )}
              >
                {isDone ? (
                  <svg
                    viewBox="0 0 20 20"
                    width={20}
                    height={20}
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-green"
                  >
                    <path d="M4 10l4 4 8-9" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 20 20"
                    width={20}
                    height={20}
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    className="shrink-0 text-ink-3"
                  >
                    <path d="M10 3a7 7 0 1 0 7 7" />
                  </svg>
                )}
                <span className={cn('text-sm', isDone ? 'text-ink' : 'text-ink-2')}>{label}</span>
              </div>
            );
          })}
        </div>

        {found >= 1 ? (
          <Link
            href="/start/reveal"
            className="mt-auto flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em]"
          >
            Show my pass
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="pointer-events-none mt-auto flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em] opacity-40"
          >
            Show my pass
          </span>
        )}
        <p className="text-center text-[13px] leading-[1.5] text-ink-3">
          Nothing showing up? Your Steam game details may be private.{' '}
          <a href="#" className="text-ink">
            How to open them
          </a>
        </p>
      </main>
    </div>
  );
}

/** Wrapped in Suspense because the inner screen reads the connection id from the query. */
export default function BuildingPage() {
  return (
    <Suspense fallback={<div className="app-shell min-h-dvh" />}>
      <Building />
    </Suspense>
  );
}
