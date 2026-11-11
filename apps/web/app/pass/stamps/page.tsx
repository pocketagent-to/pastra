import { AppShell } from '@/components/layout/AppShell';
import { cn } from '@/lib/cn';
import { getStampsView } from '@pastra/core';
import { requireUser } from '@/lib/data';
import { coreDeps } from '@/lib/server';

export const dynamic = 'force-dynamic';

function StampCard({
  axis,
  name,
  meta,
  earned,
}: {
  axis: string;
  name: string;
  meta?: string;
  earned: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[124px] flex-col justify-between gap-2.5 rounded-tile p-3.5',
        earned ? 'border-2 border-orange' : 'border-[1.5px] border-dashed border-[#6B7080]',
      )}
    >
      <div
        className={cn(
          'font-head text-[10px] font-bold uppercase tracking-[0.06em]',
          earned ? 'text-orange-light' : 'text-ink-3',
        )}
      >
        {axis}
      </div>
      <div
        className={cn(
          'font-head text-sm font-bold uppercase leading-[1.25]',
          earned ? 'text-ink' : 'text-ink-2',
        )}
      >
        {name}
      </div>
      {meta ? <div className="text-xs text-ink-3">{meta}</div> : null}
    </div>
  );
}

/** B5 · Stamps — earned and "next to earn" (docs/product-spec.md section 12). */
export default async function Stamps() {
  const user = await requireUser();
  const { db, catalog } = coreDeps();
  const { collected, nextToEarn } = await getStampsView(db, catalog, user.id);

  return (
    <AppShell back="/pass" title="Stamps">
      <div className="flex flex-col gap-[22px] pt-2">
        <div className="flex flex-col gap-1.5">
          <div className="font-head text-[26px] font-extrabold uppercase">
            {collected.length} collected
          </div>
          <div className="text-sm text-ink-2">New stamps arrive with the weekly drop.</div>
        </div>

        {collected.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">Yours</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {collected.map((s, i) => (
                <StampCard
                  key={`${s.axis}-${s.name}-${i}`}
                  axis={s.axis}
                  name={s.name}
                  meta={s.meta}
                  earned
                />
              ))}
            </div>
          </section>
        )}

        {nextToEarn.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
              Next to earn
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {nextToEarn.map((s, i) => (
                <StampCard
                  key={`${s.axis}-${s.name}-${i}`}
                  axis={s.axis}
                  name={s.name}
                  meta={s.meta}
                  earned={false}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
