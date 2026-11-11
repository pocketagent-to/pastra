import Link from 'next/link';
import { RecoverMethods } from './RecoverMethods';

export const dynamic = 'force-dynamic';

/** A12 · Recover access — sign in with another linked method (docs/product-spec.md section 12). */
export default function Recover() {
  const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  return (
    <main className="app-shell flex min-h-dvh flex-col">
      <header className="flex items-center gap-3.5 bg-[#16171B] px-5 py-3.5">
        <Link
          href="/login"
          aria-label="Back to log in"
          className="flex h-11 w-11 items-center justify-center rounded-chip border-[1.5px] border-white text-white"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </Link>
        <span className="font-head text-base font-extrabold tracking-[0.04em]">RECOVER ACCESS</span>
      </header>

      <div className="flex flex-1 flex-col gap-[22px] px-5 py-6">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-head text-2xl font-extrabold uppercase leading-[1.2]">
            Get back into your pass
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Use the other sign-in method you added to your pass.
          </p>
        </div>

        <RecoverMethods privyConfigured={privyConfigured} />

        <div className="mt-auto rounded-tile border-[1.5px] border-dashed border-[#6B7080] p-4 text-[13px] leading-relaxed text-ink-2">
          Neither works? Write to [SUPPORT EMAIL]. We&rsquo;ll ask you to prove you own one of the
          services connected to your pass.
        </div>
      </div>
    </main>
  );
}
