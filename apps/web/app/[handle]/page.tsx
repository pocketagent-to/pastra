import type { Metadata } from 'next';
import Link from 'next/link';
import type { Axis } from '@pastra/catalog';
import { Logo } from '@/components/brand/Logo';
import { Hexagon } from '@/components/ui/Hexagon';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { GradientText } from '@/components/ui/GradientText';
import { KeyNumber } from '@/components/ui/KeyNumber';
import { StampBadge } from '@/components/ui/StampBadge';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { cn } from '@/lib/cn';
import { EXAMPLE_PASS, axesValues } from '@/lib/example';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `${handle} · Hextra`,
    description: `${handle}'s pass: LVL ${EXAMPLE_PASS.level}, ${EXAMPLE_PASS.title}.`,
    openGraph: { images: [`/og/${handle}.png`] },
  };
}

/** B9 · Public pass — the viral surface, server-rendered with an Open Graph image. */
export default async function PublicPass({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const pass = EXAMPLE_PASS;
  // Sports is private by default; a public viewer never sees it.
  const hidden = HEX_AXIS_ORDER.filter((a) => pass.axes[a].visibility !== 'everyone');
  const visible = (axis: Axis) => !hidden.includes(axis);

  return (
    <div className="app-shell min-h-dvh px-4">
      <header className="flex items-center justify-between py-3">
        <Logo size={34} />
        <Link
          href="/signup"
          className="flex h-11 items-center rounded-[12px] bg-orange px-4 font-head text-[11px] font-bold uppercase tracking-[0.04em] text-on-orange"
        >
          Get yours
        </Link>
      </header>

      <main className="space-y-5 pb-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <GradientText className="text-[30px] font-extrabold uppercase leading-[1.1]">
              {handle}
            </GradientText>
            <LevelBadge level={pass.level} />
          </div>
          <div className="font-head text-[13px] font-medium uppercase tracking-[0.04em] text-orange-light">
            {pass.title}
          </div>
        </div>

        <div className="flex justify-center rounded-panel bg-panel p-4">
          <Hexagon values={axesValues()} hidden={hidden} size={320} />
        </div>

        <section className="rounded-panel bg-panel px-4">
          {pass.keyNumbers
            .filter((k) => visible(k.axis))
            .slice(0, 3)
            .map((k, i) => (
              <div key={k.label} className={cn('py-3', i > 0 && 'border-t border-divider')}>
                <KeyNumber value={k.value} label={k.label} provider={k.provider} />
              </div>
            ))}
        </section>

        <div className="flex flex-wrap gap-2">
          {pass.stamps
            .filter((s) => s.axis === 'all' || visible(s.axis))
            .map((s) => (
              <StampBadge key={s.key} label={s.label} />
            ))}
        </div>

        <p className="text-xs text-ink-3">This page shows only what {handle} chose to share.</p>

        <div className="flex flex-col gap-3 rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
          <div className="font-head text-lg font-extrabold uppercase leading-[1.25]">
            What does your shape look like?
          </div>
          <PrimaryButton href="/signup">Build my pass</PrimaryButton>
          <OutlineButton href={`/signup?compare=${handle}`}>Compare with {handle}</OutlineButton>
        </div>
      </main>
    </div>
  );
}
