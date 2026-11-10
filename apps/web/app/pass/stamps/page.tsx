import { AppShell } from '@/components/layout/AppShell';
import { cn } from '@/lib/cn';

const YOURS: Array<{ axis: string; name: string; meta: string }> = [
  { axis: 'Crypto', name: 'In crypto since 2019', meta: 'Week 41' },
  { axis: 'Gaming', name: '2,000+ hours', meta: 'Week 46 · new' },
  { axis: 'Crypto', name: 'Collector', meta: 'Week 43' },
];

const NEXT: Array<{ axis: string; name: string; meta: string }> = [
  { axis: 'Sports', name: 'Marathoner', meta: '12 active weeks in a row' },
  { axis: 'Lifestyle', name: 'Traveler', meta: 'Check in across 10 countries' },
  { axis: 'Music', name: 'Explorer', meta: '500 artists in your collection' },
  { axis: 'All sides', name: 'Full hexagon', meta: 'Fill all six sides' },
];

function StampCard({
  axis,
  name,
  meta,
  earned,
}: {
  axis: string;
  name: string;
  meta: string;
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
      <div className="text-xs text-ink-3">{meta}</div>
    </div>
  );
}

/** B5 · Stamps — earned and "next to earn" (docs/product-spec.md section 12). */
export default function Stamps() {
  return (
    <AppShell back="/pass" title="Stamps">
      <div className="flex flex-col gap-[22px] pt-2">
        <div className="flex flex-col gap-1.5">
          <div className="font-head text-[26px] font-extrabold uppercase">
            {YOURS.length} collected
          </div>
          <div className="text-sm text-ink-2">New stamps arrive with the weekly drop.</div>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">Yours</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {YOURS.map((s) => (
              <StampCard key={s.name} axis={s.axis} name={s.name} meta={s.meta} earned />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
            Next to earn
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {NEXT.map((s) => (
              <StampCard key={s.name} axis={s.axis} name={s.name} meta={s.meta} earned={false} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
