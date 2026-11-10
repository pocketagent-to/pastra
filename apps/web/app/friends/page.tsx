import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { OutlineButton, PrimaryButton } from '@/components/ui/Button';
import { EXAMPLE_FRIENDS } from '@/lib/example';

/** E1 · Friends (docs/product-spec.md section 10). */
export default function FriendsScreen() {
  return (
    <AppShell tab>
      <div className="space-y-5 pt-2">
        <h1 className="font-head text-2xl font-extrabold">Friends</h1>

        <div className="space-y-3 rounded-panel border border-divider bg-panel p-4">
          <p className="text-sm text-ink-2">Invite a friend and you both get +5 points.</p>
          <div className="grid grid-cols-2 gap-2">
            <PrimaryButton href="/friends/add">Copy invite link</PrimaryButton>
            <OutlineButton href="/friends/add">Add by code</OutlineButton>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Your circle</h2>
          <div className="divide-y divide-divider rounded-panel border border-divider bg-panel">
            {EXAMPLE_FRIENDS.map((f) => (
              <Link
                key={f.handle}
                href={`/friends/${f.handle}`}
                className="flex items-center justify-between p-3 hover:opacity-80"
              >
                <div>
                  <div className="font-semibold">{f.handle}</div>
                  <div className="text-xs text-ink-3">{f.lead}</div>
                </div>
                <LevelBadge level={f.level} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
