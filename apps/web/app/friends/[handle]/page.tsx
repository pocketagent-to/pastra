import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Hexagon } from '@/components/ui/Hexagon';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { GradientText } from '@/components/ui/GradientText';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

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
  return (
    <AppShell back="/friends" title={handle}>
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-head text-2xl font-extrabold">{handle}</div>
            <GradientText className="text-sm font-bold">Music fan</GradientText>
          </div>
          <LevelBadge level={22} />
        </div>

        <div className="flex justify-center">
          <Hexagon values={FRIEND} size={280} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton href={`/friends/${handle}/compare`}>Compare</PrimaryButton>
          <OutlineButton href="/friends">Remove friend</OutlineButton>
        </div>

        <Link href="/friends" className="block text-center text-xs text-ink-3 underline">
          Back to friends
        </Link>
      </div>
    </AppShell>
  );
}
