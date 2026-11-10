import Link from 'next/link';
import type { Axis } from '@pastra/catalog';
import { AppShell } from '@/components/layout/AppShell';
import { Hexagon } from '@/components/ui/Hexagon';
import { DropTimer } from '@/components/ui/DropTimer';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { GradientText } from '@/components/ui/GradientText';
import { KeyNumber } from '@/components/ui/KeyNumber';
import { StampBadge } from '@/components/ui/StampBadge';
import { PrimaryButton } from '@/components/ui/Button';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { cn } from '@/lib/cn';
import { requireUser, getPassView } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** B1 · Pass — the main screen, live from the signed-in user (docs/product-spec.md section 12). */
export default async function PassScreen() {
  const user = await requireUser();
  const pass = await getPassView(user);

  if (pass.empty) {
    return (
      <AppShell tab>
        <div className="flex min-h-full flex-col gap-5 pt-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-head text-[28px] font-extrabold uppercase leading-[1.1]">
              {pass.handle}
            </div>
            <LevelBadge level={1} />
          </div>

          <div className="rounded-panel bg-panel p-4">
            <Hexagon values={{}} size={300} />
          </div>

          <div className="flex flex-col gap-2.5 text-center">
            <div className="font-head text-xl font-extrabold uppercase leading-tight">
              Your pass has no shape yet
            </div>
            <p className="text-[15px] leading-relaxed text-ink-2">
              Connect one service and your first side fills in within a minute.
            </p>
          </div>

          <PrimaryButton href="/services" className="mt-auto">
            Connect a service
          </PrimaryButton>
        </div>
      </AppShell>
    );
  }

  const values = Object.fromEntries(HEX_AXIS_ORDER.map((a) => [a, pass.axes[a].score])) as Record<
    Axis,
    number
  >;
  const hidden = HEX_AXIS_ORDER.filter((a) => pass.axes[a].visibility === 'me');

  return (
    <AppShell tab>
      <div className="space-y-5 pt-1">
        <DropTimer nextDropAt={pass.nextDropAt} serverNow={pass.serverNow} />

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <GradientText className="text-[28px] font-extrabold uppercase leading-[1.1]">
              {pass.handle}
            </GradientText>
            <LevelBadge level={pass.level} />
          </div>
          <div className="font-head text-[13px] font-medium uppercase tracking-[0.04em] text-orange-light">
            {pass.title}
          </div>
        </div>

        <div
          className="flex flex-col items-center gap-2.5 rounded-panel p-4"
          style={{ background: 'radial-gradient(85% 60% at 50% 40%, #22359E 0%, #16171B 78%)' }}
        >
          <Hexagon values={values} hidden={hidden} size={300} linkAxes />
          <Link
            href="/pass/recap"
            className="flex w-full items-center gap-2.5 rounded-[14px] bg-status px-3.5 py-2.5 text-[#04130A] shadow-[0_0_18px_rgba(46,204,113,0.45)]"
          >
            <svg
              viewBox="0 0 20 20"
              width="20"
              height="20"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 13l5-5 3 3 6-7" />
            </svg>
            <span className="font-head text-xs font-bold">
              Week {pass.week.split('-W')[1]} · see recap
            </span>
          </Link>
        </div>

        {pass.keyNumbers.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-head text-lg font-extrabold uppercase">Your numbers</h2>
            <div className="rounded-panel bg-panel px-4">
              {pass.keyNumbers.slice(0, 4).map((k, i) => (
                <div key={k.label} className={cn('py-3', i > 0 && 'border-t border-divider')}>
                  <KeyNumber value={k.value} label={k.label} />
                </div>
              ))}
            </div>
          </section>
        )}

        {pass.stamps.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-head text-lg font-extrabold uppercase">Stamps</h2>
              <Link
                href="/pass/stamps"
                className="flex min-h-11 items-center text-sm font-semibold text-orange-light"
              >
                See all
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {pass.stamps.map((s) => (
                <StampBadge key={s.key} label={s.label} isNew={s.isNew} />
              ))}
            </div>
          </section>
        )}

        <PrimaryButton href="/share">Share your pass</PrimaryButton>
      </div>
    </AppShell>
  );
}
