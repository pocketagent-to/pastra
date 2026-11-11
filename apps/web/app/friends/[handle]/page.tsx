import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog } from '@pastra/catalog';
import { currentWeek, getFriendProfile } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { Hexagon } from '@/components/ui/Hexagon';
import { GradientText } from '@/components/ui/GradientText';
import { PrimaryButton } from '@/components/ui/Button';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';

/** E4 · Friend profile (docs/product-spec.md section 12). */
export default async function FriendProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await requireUser();
  const profile = await getFriendProfile(getDb(), catalog, user.id, handle, currentWeek());
  if (!profile) notFound();

  const initial = profile.handle.charAt(0).toUpperCase();
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
              {profile.handle}
            </GradientText>
            <div className="text-[13px] text-ink-3">[your-domain]/{profile.handle}</div>
          </div>
          <span className="whitespace-nowrap rounded-[10px] bg-orange px-3 py-1.5 font-head text-[13px] font-bold text-on-orange">
            LVL {profile.level}
          </span>
        </div>

        <div className="font-head text-sm font-medium uppercase tracking-[0.03em] text-orange-light">
          {profile.title}
        </div>

        <div
          className="rounded-panel p-4"
          style={{ background: 'radial-gradient(85% 60% at 50% 40%, #22359E 0%, #16171B 78%)' }}
        >
          <div className="flex justify-center">
            <Hexagon values={profile.axes} size={300} />
          </div>
        </div>

        <p className="text-[13px] leading-[1.5] text-ink-3">
          You see the sides <span className="capitalize">{profile.handle}</span> shares with
          friends.
        </p>

        <div className="mt-auto flex flex-col gap-2.5">
          <PrimaryButton href={`/friends/${profile.handle}/compare`} className="h-14 text-sm">
            Compare with {profile.handle}
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
