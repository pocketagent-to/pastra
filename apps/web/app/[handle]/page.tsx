import type { Metadata } from 'next';
import Link from 'next/link';
import type { Axis } from '@pastra/catalog';
import { catalog } from '@pastra/catalog';
import { getPublicPassByHandle } from '@pastra/core';
import { Logo } from '@/components/brand/Logo';
import { Hexagon } from '@/components/ui/Hexagon';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { GradientText } from '@/components/ui/GradientText';
import { StampBadge } from '@/components/ui/StampBadge';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { cn } from '@/lib/cn';
import { getDb } from '@/lib/server';

// Public viral surface: identical for all logged-out viewers of a handle, so serve it from the CDN
// and revalidate every 5 min. This shared cache is valid ONLY for the public projection — keep this
// page free of cookies()/headers(); any friend/self viewer variant must render in its own route.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const title = `${handle} · HEXTRA`;
  const description = `${handle}'s pass on HEXTRA — six sides of their life in one hexagon.`;
  return {
    title,
    description,
    openGraph: { title, description, images: [`/og/${handle}.png`] },
  };
}

/** B9 · Public pass — the viral surface, server-rendered on live data with an Open Graph image. */
export default async function PublicPass({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const pass = await getPublicPassByHandle(getDb(), catalog, handle);

  if (!pass) {
    return (
      <div className="app-shell flex min-h-dvh flex-col px-4">
        <header className="flex items-center justify-between py-3">
          <Logo size={34} />
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-5 pb-16 text-center">
          <div className="font-head text-2xl font-extrabold uppercase leading-tight">
            No pass here yet
          </div>
          <p className="max-w-[300px] text-[15px] text-ink-2">
            This pass isn&apos;t available. Build your own — six sides of your life in one hexagon.
          </p>
          <div className="w-full max-w-[320px]">
            <PrimaryButton href="/signup">Build my pass</PrimaryButton>
          </div>
        </main>
      </div>
    );
  }

  const values = {} as Record<Axis, number>;
  const hidden: Axis[] = [];
  for (const axis of HEX_AXIS_ORDER) {
    values[axis] = pass.axes[axis]?.score ?? 0;
    if (!pass.axes[axis]?.visible) hidden.push(axis);
  }

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
              {pass.handle}
            </GradientText>
            {pass.level != null && <LevelBadge level={pass.level} />}
          </div>
          <div className="font-head text-[13px] font-medium uppercase tracking-[0.04em] text-orange-light">
            {pass.title}
          </div>
          {pass.bio && <p className="text-[14px] leading-snug text-ink-2">{pass.bio}</p>}
        </div>

        <div className="flex justify-center rounded-panel bg-panel p-4">
          <Hexagon values={values} hidden={hidden} size={320} />
        </div>

        {pass.keyNumbers.length > 0 && (
          <section className="rounded-panel bg-panel px-4 py-1.5">
            {pass.keyNumbers.slice(0, 3).map((k, i) => (
              <div
                key={k.label}
                className={cn('flex items-center gap-3 py-3', i > 0 && 'border-t border-divider')}
              >
                <span className="w-24 font-head text-[17px] font-bold text-orange">{k.value}</span>
                <span className="flex-1 text-[14px]">{k.label}</span>
              </div>
            ))}
          </section>
        )}

        {pass.stamps.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pass.stamps.map((s) => (
              <StampBadge key={s.key} label={s.label} />
            ))}
          </div>
        )}

        <p className="text-xs text-ink-3">
          This page shows only what {pass.handle} chose to share.
        </p>

        <div className="flex flex-col gap-3 rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
          <div className="font-head text-lg font-extrabold uppercase leading-[1.25]">
            What does your shape look like?
          </div>
          <PrimaryButton href="/signup">Build my pass</PrimaryButton>
          <OutlineButton href={`/signup?compare=${pass.handle}`}>
            Compare with {pass.handle}
          </OutlineButton>
        </div>
      </main>
    </div>
  );
}
