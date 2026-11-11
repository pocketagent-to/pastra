import Link from 'next/link';
import { catalog } from '@pastra/catalog';
import { currentWeek, getFriendsView } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';

/** E1 · Friends (docs/product-spec.md section 10). */
export default async function FriendsScreen() {
  const user = await requireUser();
  const view = await getFriendsView(getDb(), catalog, user.id, currentWeek());

  if (view.empty) {
    return (
      <AppShell tab>
        <div className="flex min-h-full flex-col gap-[22px] pt-2">
          <h1 className="font-head text-[26px] font-extrabold uppercase leading-[1.15]">Friends</h1>

          <div className="flex justify-center py-2">
            <svg viewBox="-130 -120 260 240" width="230" height="212" aria-hidden="true">
              <polygon
                points="-30,-95 52.3,-47.5 52.3,47.5 -30,95 -112.3,47.5 -112.3,-47.5"
                fill="#1F4BFF"
                fillOpacity="0.25"
                stroke="#7C9BFF"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <polygon
                points="30,-95 112.3,-47.5 112.3,47.5 30,95 -52.3,47.5 -52.3,-47.5"
                fill="none"
                stroke="#6B7080"
                strokeWidth="3"
                strokeDasharray="7 6"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex flex-col gap-2.5 text-center">
            <div className="font-head text-xl font-extrabold uppercase leading-[1.2]">
              No one to compare with yet
            </div>
            <p className="text-[15px] leading-[1.5] text-ink-2">
              Send your link. When a friend builds a pass, you&apos;ll see both shapes side by side
              and you both get +5 points.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2.5">
            <div className="flex h-12 items-center rounded-[14px] bg-panel px-3.5 text-sm text-ink-2">
              [your-domain]/i/{view.handle}
            </div>
            <button
              type="button"
              className="h-14 w-full rounded-button bg-orange font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
            >
              Copy invite link
            </button>
            <Link
              href="/share"
              className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em] text-ink"
            >
              Share my pass instead
            </Link>
            <Link
              href="/friends/add"
              className="flex min-h-11 items-center justify-center text-sm text-ink-2"
            >
              Add a friend by code
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell tab>
      <div className="flex flex-col gap-[22px] pt-2">
        <h1 className="font-head text-[26px] font-extrabold uppercase leading-[1.15]">Friends</h1>

        {/* Invite card */}
        <div className="flex flex-col gap-3 rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
          <div className="font-head text-[15px] font-bold uppercase leading-[1.3]">
            Invite a friend, compare shapes
          </div>
          <p className="text-sm leading-[1.45] text-ink-2">
            You both get +5 points when they build a pass.
          </p>
          <div className="flex h-12 items-center rounded-[14px] border border-[#1F2C6B] bg-black px-3.5 text-sm text-ink-2">
            [your-domain]/i/{view.handle}
          </div>
          <button
            type="button"
            className="h-[52px] w-full rounded-button bg-orange font-head text-[13px] font-bold uppercase tracking-[0.03em] text-on-orange"
          >
            Copy invite link
          </button>
        </div>

        {/* Add a friend by code */}
        <Link
          href="/friends/add"
          className="flex min-h-[68px] items-center justify-between gap-3 rounded-[20px] bg-panel px-4 py-3"
        >
          <span className="flex flex-col gap-1">
            <span className="text-[15px] font-semibold">Add a friend by code</span>
            <span className="text-[13px] text-ink-3">
              Your code ·{' '}
              <span className="font-head font-bold tracking-[0.12em] text-ink">
                {view.friendCode}
              </span>
            </span>
          </span>
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            fill="none"
            stroke="#FF6B2C"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="flex-shrink-0"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>

        {/* Your friends */}
        <section className="flex flex-col gap-3">
          <h2 className="font-head text-[13px] font-bold tracking-[0.05em]">
            YOUR FRIENDS · {view.friends.length}
          </h2>
          <div className="divide-y divide-divider rounded-panel bg-panel px-4">
            {view.friends.map((f) => (
              <Link
                key={f.handle}
                href={`/friends/${f.handle}`}
                className="flex min-h-[68px] items-center gap-3"
              >
                <span className="flex flex-grow flex-col gap-0.5">
                  <span className="font-head text-sm font-bold uppercase">{f.handle}</span>
                  <span className="text-xs text-ink-3">{f.summary}</span>
                </span>
                <span className="font-head text-[13px] font-bold text-orange">LVL {f.level}</span>
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  aria-hidden="true"
                  fill="none"
                  stroke="#C7CBD6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* Invited, hasn't joined yet */}
        {view.pending.length > 0 && (
          <section className="flex flex-col gap-3">
            {view.pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-dashed border-[#6B7080] px-4 py-[14px]"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="text-sm font-semibold">{p.handle}</div>
                  <div className="text-xs text-ink-3">Invited, hasn&apos;t joined yet</div>
                </div>
                <button
                  type="button"
                  className="h-11 rounded-xl border-[1.5px] border-white px-4 text-[13px] font-semibold"
                >
                  Remind
                </button>
              </div>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
