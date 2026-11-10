import type { Metadata } from 'next';
import type { Axis } from '@pastra/catalog';
import { Logo } from '@/components/brand/Logo';
import { Hexagon } from '@/components/ui/Hexagon';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { GradientText } from '@/components/ui/GradientText';
import { KeyNumber } from '@/components/ui/KeyNumber';
import { StampBadge } from '@/components/ui/StampBadge';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { EXAMPLE_PASS, axesValues } from '@/lib/example';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `${handle} · Pastra`,
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
        <Logo size={28} />
        <LevelBadge level={pass.level} />
      </header>

      <main className="space-y-6">
        <div className="text-center">
          <div className="font-head text-2xl font-extrabold">{handle}</div>
          <GradientText className="text-sm font-bold">{pass.title}</GradientText>
        </div>

        <div className="flex justify-center">
          <Hexagon values={axesValues()} hidden={hidden} size={300} />
        </div>

        <section className="space-y-2">
          {pass.keyNumbers
            .filter((k) => visible(k.axis))
            .slice(0, 3)
            .map((k) => (
              <KeyNumber key={k.label} value={k.value} label={k.label} />
            ))}
        </section>

        <div className="flex flex-wrap justify-center gap-2">
          {pass.stamps
            .filter((s) => s.axis === 'all' || visible(s.axis))
            .map((s) => (
              <StampBadge key={s.key} label={s.label} />
            ))}
        </div>

        <p className="text-center text-xs text-ink-3">
          This page shows only what {handle} chose to share.
        </p>

        <div className="grid grid-cols-2 gap-2 pb-8">
          <PrimaryButton href="/signup">Build my pass</PrimaryButton>
          <OutlineButton href={`/signup?compare=${handle}`}>Compare with {handle}</OutlineButton>
        </div>
      </main>
    </div>
  );
}
