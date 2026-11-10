import { AppShell } from '@/components/layout/AppShell';
import { StampBadge } from '@/components/ui/StampBadge';
import { GradientText } from '@/components/ui/GradientText';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** B6 · Weekly recap (docs/product-spec.md section 7). */
export default function Recap() {
  return (
    <AppShell back="/pass" title="Your week">
      <div className="space-y-6 pt-2 text-center" style={{ backgroundImage: 'var(--bg-reveal)' }}>
        <div className="font-head text-3xl font-extrabold">
          LVL 26 <span className="text-ink-3">→</span> <GradientText>27</GradientText>
        </div>

        <div className="space-y-2 rounded-panel border border-divider bg-panel p-4 text-left">
          {[
            { axis: 'Gaming', delta: '+3' },
            { axis: 'Lifestyle', delta: '+4' },
            { axis: 'Social', delta: '-2' },
          ].map((r) => (
            <div key={r.axis} className="flex justify-between text-sm">
              <span>{r.axis}</span>
              <span className={r.delta.startsWith('-') ? 'text-orange-light' : 'text-green'}>
                {r.delta}
              </span>
            </div>
          ))}
        </div>

        <div className="text-sm text-ink-2">+18 hours in CS2 this week</div>
        <div className="flex justify-center">
          <StampBadge label="2,000+ hours" isNew />
        </div>

        <div className="space-y-3">
          <PrimaryButton href="/offers">See 3 new offers</PrimaryButton>
          <OutlineButton href="/share">Share my week</OutlineButton>
        </div>
      </div>
    </AppShell>
  );
}
