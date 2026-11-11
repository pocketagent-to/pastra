import { AppShell } from '@/components/layout/AppShell';
import { PrimaryButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { currentWeek, getRecapView } from '@pastra/core';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';

export const dynamic = 'force-dynamic';

/** B6 · Weekly recap (docs/product-spec.md section 7). */
export default async function Recap() {
  const user = await requireUser();
  const recap = await getRecapView(getDb(), user.id, currentWeek());

  if (!recap) {
    return (
      <AppShell back="/pass" title="Weekly recap">
        <div className="flex min-h-full flex-col items-center justify-center gap-3 pb-12 text-center">
          <div className="font-head text-xl font-extrabold uppercase leading-tight">
            No recap yet
          </div>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Your first weekly recap arrives with the next drop.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back="/pass" title="Weekly recap">
      <div
        className="flex min-h-full flex-col gap-[22px] pt-2"
        style={{ backgroundImage: 'var(--bg-reveal)' }}
      >
        <div className="flex flex-col items-start gap-3">
          <span className="rounded-[10px] bg-blue px-3.5 py-1.5 font-head text-[11px] font-bold uppercase tracking-[0.06em]">
            {recap.weekLabel}
          </span>
          <h1 className="font-head text-[28px] font-extrabold uppercase leading-[1.15]">
            The drop is here
          </h1>
        </div>

        <div className="flex items-center justify-between rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
          <div className="flex flex-col gap-1">
            <div className="text-[13px] text-ink-2">Level</div>
            <div className="font-head text-[26px] font-extrabold">
              {recap.leveledUp ? (
                <>
                  {recap.levelFrom} <span className="text-orange">→ {recap.levelTo}</span>
                </>
              ) : (
                recap.levelTo
              )}
            </div>
          </div>
          {recap.leveledUp && (
            <span className="rounded-chip bg-status px-3.5 py-2 font-head text-[11px] font-bold uppercase text-[#04130A] shadow-[0_0_16px_rgba(46,204,113,0.45)]">
              Level up
            </span>
          )}
        </div>

        {recap.axisDeltas.length > 0 && (
          <div className="rounded-panel bg-panel px-4">
            {recap.axisDeltas.map((r, i) => (
              <div
                key={r.axis}
                className={cn('flex h-12 items-center', i > 0 && 'border-t border-divider')}
              >
                <span className="flex-1 font-head text-xs font-bold uppercase tracking-[0.04em]">
                  {r.axis}
                </span>
                <span
                  className={cn(
                    'font-head text-[15px]',
                    r.delta > 0
                      ? 'font-bold text-green'
                      : r.delta < 0
                        ? 'font-bold text-orange-light'
                        : 'font-medium text-ink-3',
                  )}
                >
                  {r.delta > 0 ? `▲ +${r.delta}` : r.delta < 0 ? `▼ −${Math.abs(r.delta)}` : '0'}
                </span>
              </div>
            ))}
          </div>
        )}

        {recap.newStamps.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
              New stamp
            </div>
            {recap.newStamps.map((s, i) => (
              <div
                key={`${s.axis}-${s.name}-${i}`}
                className="flex flex-col gap-2 rounded-tile border-2 border-orange p-3.5"
              >
                <div className="font-head text-[10px] font-bold uppercase tracking-[0.06em] text-orange-light">
                  {s.axis}
                </div>
                <div className="font-head text-base font-bold uppercase">{s.name}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2.5 pb-2">
          <PrimaryButton href="/share">Share my week</PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}
