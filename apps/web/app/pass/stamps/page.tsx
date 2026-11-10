import { AppShell } from '@/components/layout/AppShell';
import { StampBadge } from '@/components/ui/StampBadge';
import { EXAMPLE_PASS } from '@/lib/example';

const NEXT = ['5,000+ hours', 'Collector', '10K club', 'Marathoner'];

/** B5 · Stamps — earned and "next to earn" (docs/product-spec.md section 12). */
export default function Stamps() {
  return (
    <AppShell back="/pass" title="Stamps">
      <div className="space-y-6 pt-2">
        <section className="space-y-2">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Earned</h2>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PASS.stamps.map((s) => (
              <StampBadge key={s.key} label={s.label} isNew={s.isNew} />
            ))}
          </div>
        </section>
        <section className="space-y-2">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Next to earn</h2>
          <div className="flex flex-wrap gap-2">
            {NEXT.map((n) => (
              <StampBadge key={n} label={n} earned={false} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
