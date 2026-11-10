import Link from 'next/link';
import type { Axis } from '@pastra/catalog';
import { AppShell } from '@/components/layout/AppShell';
import { Hexagon } from '@/components/ui/Hexagon';
import { DropTimer } from '@/components/ui/DropTimer';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { GradientText } from '@/components/ui/GradientText';
import { AxisRow } from '@/components/ui/AxisRow';
import { KeyNumber } from '@/components/ui/KeyNumber';
import { StampBadge } from '@/components/ui/StampBadge';
import { PrimaryButton } from '@/components/ui/Button';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { requireUser, getPassView } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** B1 · Pass — the main screen, live from the signed-in user (docs/product-spec.md section 12). */
export default async function PassScreen() {
  const user = await requireUser();
  const pass = await getPassView(user);

  if (pass.empty) {
    return (
      <AppShell tab>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Hexagon values={{}} size={240} />
          <LevelBadge level={1} />
          <p className="max-w-xs text-sm text-ink-2">
            Your pass is empty. Connect a service to reveal your first side.
          </p>
          <PrimaryButton href="/services">Connect a service</PrimaryButton>
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
      <div className="space-y-6 pt-2">
        <DropTimer nextDropAt={pass.nextDropAt} serverNow={pass.serverNow} />

        <div className="flex items-center justify-between">
          <div>
            <div className="font-head text-2xl font-extrabold">{pass.handle}</div>
            <GradientText className="text-sm font-bold">{pass.title}</GradientText>
          </div>
          <LevelBadge level={pass.level} />
        </div>

        <div className="flex flex-col items-center">
          <Hexagon values={values} hidden={hidden} size={280} />
          <Link href="/pass/recap" className="mt-2 text-xs text-ink-3 underline">
            Week {pass.week.split('-W')[1]} · see recap
          </Link>
        </div>

        {pass.keyNumbers.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Your numbers</h2>
            {pass.keyNumbers.slice(0, 4).map((k) => (
              <KeyNumber key={k.label} value={k.value} label={k.label} />
            ))}
          </section>
        )}

        <section className="rounded-panel border border-divider bg-panel p-4">
          {HEX_AXIS_ORDER.map((axis: Axis) => (
            <AxisRow
              key={axis}
              axis={axis}
              score={pass.axes[axis].score}
              delta={pass.axes[axis].delta}
              hidden={pass.axes[axis].visibility === 'me'}
              href={`/pass/${axis}`}
            />
          ))}
        </section>

        {pass.stamps.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Stamps</h2>
              <Link href="/pass/stamps" className="text-xs text-ink-3 underline">
                All stamps
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
