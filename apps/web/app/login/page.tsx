import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { LoginMethods } from './LoginMethods';

export const dynamic = 'force-dynamic';

/** A11 · Log in — Google and email only (docs/product-spec.md section 12). */
export default function Login() {
  const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  return (
    <main className="app-shell flex min-h-dvh flex-col">
      <header className="flex min-h-11 items-center gap-2.5 bg-[#16171B] px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">HEXTRA</span>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-8">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-head text-[28px] font-extrabold uppercase leading-[1.15]">
            Welcome back
          </h1>
          <p className="text-[15px] text-ink-2">Use Google or the email you signed up with.</p>
        </div>

        <LoginMethods privyConfigured={privyConfigured} />

        <div className="mt-auto flex flex-col items-center gap-1">
          <Link href="/recover" className="flex min-h-11 items-center text-[14px] text-ink-2">
            Can&rsquo;t get into your email or Google?
          </Link>
          <Link href="/signup" className="flex min-h-11 items-center text-[14px] text-ink-2">
            New here? Build a pass
          </Link>
        </div>
      </div>
    </main>
  );
}
