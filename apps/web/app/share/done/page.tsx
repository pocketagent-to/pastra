import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';

/** B8 · Share — done (docs/product-spec.md section 12). */
export default function ShareDone() {
  return (
    <AppShell back="/pass" title="Shared" className="flex flex-col">
      <div className="flex flex-1 flex-col gap-[22px] pt-2">
        <div className="flex flex-col items-start gap-3">
          <div className="rounded-chip bg-status px-3.5 py-2 font-head text-[11px] font-bold uppercase tracking-[0.05em] text-[#04130A] shadow-[0_0_18px_rgba(46,204,113,0.45)]">
            Posted to X
          </div>
          <h1 className="font-head text-[26px] font-extrabold uppercase leading-[1.15]">
            Your pass is out there
          </h1>
          <p className="text-[15px] leading-normal text-ink-2">
            Anyone who opens your link sees only what you chose to show.
          </p>
        </div>

        <section className="flex flex-col gap-2.5">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
            Your link
          </div>
          <div className="flex h-[52px] items-center rounded-button bg-panel px-4 text-[15px]">
            [your-domain]/nomad
          </div>
          <button
            type="button"
            className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink bg-transparent font-head text-[13px] font-bold uppercase tracking-[0.03em] text-ink"
          >
            Copy link
          </button>
        </section>

        <div className="flex flex-col gap-3 rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
          <div className="font-head text-[15px] font-bold uppercase leading-[1.3]">
            Dare a friend to compare
          </div>
          <div className="text-sm leading-[1.45] text-ink-2">
            You both get +5 points when they build a pass.
          </div>
          <Link
            href="/friends"
            className="flex h-[52px] items-center justify-center rounded-button bg-orange font-head text-[13px] font-bold uppercase tracking-[0.03em] text-on-orange"
          >
            Invite friends
          </Link>
        </div>

        <Link
          href="/pass"
          className="mt-auto flex min-h-11 items-center justify-center text-sm text-ink-2"
        >
          Back to my pass
        </Link>
      </div>
    </AppShell>
  );
}
