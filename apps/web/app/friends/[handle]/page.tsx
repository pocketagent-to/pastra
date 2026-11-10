import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Hexagon } from '@/components/ui/Hexagon';
import { GradientText } from '@/components/ui/GradientText';
import { PrimaryButton } from '@/components/ui/Button';

const FRIEND = {
  gaming: 70,
  crypto: 55,
  music: 80,
  social: 44,
  lifestyle: 30,
} as const;

/** E4 · Friend profile (docs/product-spec.md section 12). */
export default async function FriendProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const initial = handle.charAt(0).toUpperCase();
  return (
    <AppShell back="/friends" title="Friend">
      <div className="flex min-h-full flex-col gap-[22px] pt-2">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex h-[72px] w-[72px] flex-shrink-0 items-center justify-center rounded-full font-head text-[28px] font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg, #FF6B2C, #C04DFF 55%, #3D6BFF)' }}
          >
            {initial}
          </div>
          <div className="flex flex-grow flex-col gap-1.5">
            <GradientText className="text-2xl font-extrabold uppercase leading-[1.1]">
              {handle}
            </GradientText>
            <div className="text-[13px] text-ink-3">[your-domain]/{handle}</div>
          </div>
          <span className="whitespace-nowrap rounded-[10px] bg-orange px-3 py-1.5 font-head text-[13px] font-bold text-on-orange">
            LVL 22
          </span>
        </div>

        <div className="font-head text-sm font-medium uppercase tracking-[0.03em] text-orange-light">
          Music fan
        </div>

        <div
          className="rounded-panel p-4"
          style={{ background: 'radial-gradient(85% 60% at 50% 40%, #22359E 0%, #16171B 78%)' }}
        >
          <div className="flex justify-center">
            <Hexagon values={FRIEND} size={300} />
          </div>
        </div>

        <p className="text-[13px] leading-[1.5] text-ink-3">
          You see the sides <span className="capitalize">{handle}</span> shares with friends.
        </p>

        <div className="mt-auto flex flex-col gap-2.5">
          <PrimaryButton href={`/friends/${handle}/compare`} className="h-14 text-sm">
            Compare with {handle}
          </PrimaryButton>
          <Link
            href="/friends"
            className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-[#FF8A7A] text-[15px] font-semibold text-[#FF8A7A]"
          >
            Remove friend
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
