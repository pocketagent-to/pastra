import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Toggle } from '@/components/ui/Toggle';

const FORMATS = ['X post', 'Story', 'Square'];

const SHOW: Array<{ label: string; on: boolean }> = [
  { label: 'Hexagon', on: true },
  { label: 'Level and title', on: true },
  { label: 'Top numbers', on: true },
  { label: 'Stamps', on: false },
];

/** B7 · Share (docs/product-spec.md section 11). */
export default function Share() {
  return (
    <AppShell back="/pass" title="Share" className="flex flex-col">
      <div className="flex flex-1 flex-col gap-[22px] pt-2">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-[20px] border border-divider bg-black">
          {/* The real share card is generated at /og/{handle}.png */}
          <img src="/og/nomad.png" alt="Share preview" className="h-full w-full object-cover" />
        </div>

        <section className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">Format</div>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f, i) => (
              <button
                key={f}
                type="button"
                aria-pressed={i === 0}
                className={
                  i === 0
                    ? 'h-12 rounded-[14px] bg-blue text-sm font-semibold text-ink'
                    : 'h-12 rounded-[14px] border-[1.5px] border-ink bg-transparent text-sm font-semibold text-ink'
                }
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
            What to show
          </div>
          <div className="flex flex-col rounded-panel bg-panel px-4">
            {SHOW.map((s, i) => (
              <div
                key={s.label}
                className={`flex min-h-[52px] items-center justify-between gap-3 text-[15px] ${
                  i > 0 ? 'border-t border-divider' : ''
                }`}
              >
                <span>{s.label}</span>
                <Toggle defaultOn={s.on} label={s.label} />
              </div>
            ))}
            <div className="flex min-h-[60px] items-center justify-between gap-3 border-t border-divider text-[15px]">
              <span className="flex flex-col gap-0.5">
                Sports side
                <span className="text-xs text-ink-3">Health data is hidden by default</span>
              </span>
              <Toggle label="Sports side" />
            </div>
          </div>
        </section>

        <div className="mt-auto flex flex-col gap-2.5">
          <Link
            href="/share/done"
            className="flex h-14 items-center justify-center rounded-button bg-orange font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
          >
            Post to X
          </Link>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink bg-transparent font-head text-xs font-bold uppercase tracking-[0.03em] text-ink"
            >
              Copy link
            </button>
            <button
              type="button"
              className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink bg-transparent font-head text-xs font-bold uppercase tracking-[0.03em] text-ink"
            >
              Save image
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
