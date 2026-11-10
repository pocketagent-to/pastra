import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Hexagon } from '@/components/ui/Hexagon';

/** A10 · Reveal — the first result, shown once (docs/product-spec.md section 12). */
export default function Reveal() {
  return (
    <div
      className="app-shell flex min-h-dvh flex-col"
      style={{ backgroundImage: 'var(--bg-reveal)' }}
    >
      <header className="flex min-h-11 items-center gap-2.5 bg-panel px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">PASTRA</span>
      </header>

      <main className="flex flex-1 flex-col gap-[22px] px-5 pt-7 pb-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span
            className="rounded-chip bg-status px-3.5 py-2 font-head text-[11px] font-bold tracking-[0.05em]"
            style={{ color: '#04130A', boxShadow: '0 0 18px rgba(46,204,113,0.45)' }}
          >
            YOUR PASS IS READY
          </span>
          <h1 className="text-gradient font-head text-[40px] font-extrabold uppercase leading-[1.1]">
            Gamer
          </h1>
          <div className="flex items-center gap-2.5">
            <span className="rounded-[10px] bg-orange px-3 py-1.5 font-head text-[13px] font-bold text-on-orange">
              LVL 7
            </span>
            <span className="text-sm text-ink-2">Top 6% in Gaming</span>
          </div>
        </div>

        <div className="rounded-panel bg-panel p-4">
          <Hexagon values={{ gaming: 94 }} size={300} />
        </div>

        <p className="text-center text-[15px] leading-[1.5] text-ink-2">
          Five sides are still empty. Connect more services to grow your shape and your level.
        </p>

        <div className="mt-auto flex flex-col gap-2.5">
          <Link
            href="/share"
            className="flex h-[56px] items-center justify-center rounded-button bg-orange font-head text-[14px] font-bold uppercase tracking-[0.03em] text-on-orange"
          >
            Share my pass
          </Link>
          <Link
            href="/services"
            className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em]"
          >
            Connect another service
          </Link>
          <Link
            href="/pass"
            className="flex min-h-11 items-center justify-center text-sm text-ink-2"
          >
            Go to my pass
          </Link>
        </div>
      </main>
    </div>
  );
}
