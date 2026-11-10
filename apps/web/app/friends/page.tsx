import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { EXAMPLE_FRIENDS, EXAMPLE_HANDLE } from '@/lib/example';

/** E1 · Friends (docs/product-spec.md section 10). */
export default function FriendsScreen() {
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
            [your-domain]/i/{EXAMPLE_HANDLE}
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
              <span className="font-head font-bold tracking-[0.12em] text-ink">K7M3QX</span>
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
            YOUR FRIENDS · {EXAMPLE_FRIENDS.length}
          </h2>
          <div className="divide-y divide-divider rounded-panel bg-panel px-4">
            {EXAMPLE_FRIENDS.map((f) => (
              <Link
                key={f.handle}
                href={`/friends/${f.handle}`}
                className="flex min-h-[68px] items-center gap-3"
              >
                <span className="flex flex-grow flex-col gap-0.5">
                  <span className="font-head text-sm font-bold uppercase">{f.handle}</span>
                  <span className="text-xs text-ink-3">{f.lead}</span>
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
      </div>
    </AppShell>
  );
}
