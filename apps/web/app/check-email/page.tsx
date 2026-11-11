import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

/** A2 · Check your email (docs/product-spec.md section 12). */
export default function CheckEmail() {
  return (
    <main className="app-shell flex min-h-dvh flex-col">
      <header className="flex min-h-11 items-center gap-2.5 bg-[#16171B] px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">HEXTRA</span>
      </header>

      <div className="flex flex-1 flex-col gap-[22px] px-5 pb-6 pt-7">
        <div className="flex flex-col gap-3">
          <span className="self-start rounded-chip bg-[linear-gradient(90deg,#3D6BFF,#6A3DFF)] px-3.5 py-2 font-head text-[11px] font-bold tracking-[0.05em] text-white">
            CHECK YOUR INBOX
          </span>
          <h1 className="text-gradient font-head text-[26px] font-extrabold uppercase leading-[1.2]">
            We sent you a link
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Open the link we sent to your email on this phone. It works for 15 minutes and only
            once.
          </p>
        </div>

        <button
          type="button"
          className="flex h-14 items-center justify-center rounded-button font-head text-[14px] font-bold uppercase tracking-[0.03em] text-on-orange"
          style={{ background: 'var(--grad-button)' }}
        >
          Open my mail app
        </button>

        <div className="flex flex-col rounded-panel bg-panel px-4 py-1">
          <div className="flex min-h-[52px] items-center justify-between gap-3 text-[14px]">
            <span className="text-ink-2">Nothing arrived? Check spam first.</span>
            <button
              type="button"
              className="min-h-11 whitespace-nowrap rounded-chip border-[1.5px] border-[#4A4E5A] px-3.5 text-[13px] font-semibold text-ink-3"
            >
              Send again
            </button>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider text-[14px]">
            <span className="text-ink-2">Wrong address?</span>
            <Link
              href="/signup"
              className="flex min-h-11 items-center text-[14px] font-semibold text-orange-light"
            >
              Use another email
            </Link>
          </div>
        </div>

        <div className="mt-auto rounded-tile border-[1.5px] border-dashed border-[#6B7080] p-4 text-[13px] leading-relaxed text-ink-2">
          If the link says it expired or was already used, come back here and ask for a new one.
        </div>
      </div>
    </main>
  );
}
