import { AppShell } from '@/components/layout/AppShell';
import { Toggle } from '@/components/ui/Toggle';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

const SHOW = ['Hexagon', 'Level and title', 'Top numbers', 'Stamps'];

/** B7 · Share (docs/product-spec.md section 11). */
export default function Share() {
  return (
    <AppShell back="/pass" title="Share">
      <div className="space-y-6 pt-2">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-panel border border-divider">
          {/* The real share card is generated at /og/{handle}.png */}
          <img src="/og/nomad.png" alt="Share preview" className="h-full w-full object-cover" />
        </div>

        <section className="space-y-1 rounded-panel border border-divider bg-panel p-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-ink-3">Format</div>
          <div className="flex gap-2">
            {['X post', 'Story', 'Square'].map((f, i) => (
              <span
                key={f}
                className={`rounded-chip px-3 py-1 text-sm ${i === 0 ? 'bg-blue/20 text-blue' : 'border border-divider text-ink-2'}`}
              >
                {f}
              </span>
            ))}
          </div>
        </section>

        <section className="space-y-1 rounded-panel border border-divider bg-panel p-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-ink-3">What to show</div>
          {SHOW.map((s) => (
            <div key={s} className="flex items-center justify-between py-2 text-sm">
              <span>{s}</span>
              <Toggle defaultOn />
            </div>
          ))}
          <div className="flex items-center justify-between py-2 text-sm text-ink-2">
            <span>Sports side</span>
            <Toggle />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton href="/share/done">Post to X</PrimaryButton>
          <OutlineButton href="/share/done">Copy link</OutlineButton>
        </div>
      </div>
    </AppShell>
  );
}
