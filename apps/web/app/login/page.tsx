import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

/** A11 · Log in — Google and email only (docs/product-spec.md section 12). */
export default function Login() {
  return (
    <main className="app-shell flex min-h-dvh flex-col">
      <header className="flex min-h-11 items-center gap-2.5 bg-[#16171B] px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">PASTRA</span>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-8">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-head text-[28px] font-extrabold uppercase leading-[1.15]">
            Welcome back
          </h1>
          <p className="text-[15px] text-ink-2">Use Google or the email you signed up with.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/api/auth/google/begin"
            className="flex h-[54px] items-center justify-center rounded-button bg-white text-[15px] font-semibold text-on-orange"
          >
            Continue with Google
          </Link>
        </div>

        <div className="flex items-center gap-3 text-[13px] text-ink-3">
          <div className="h-px flex-1 bg-divider" />
          or
          <div className="h-px flex-1 bg-divider" />
        </div>

        <form action="/login/email" method="get" className="flex flex-col gap-2.5">
          <label htmlFor="login-email" className="text-[13px] font-semibold text-ink-2">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="you@example.com"
            className="h-[54px] rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 text-[15px] text-ink placeholder:text-ink-3 outline-none"
          />
          <button
            type="submit"
            className="flex h-14 items-center justify-center rounded-button bg-orange font-head text-[13px] font-bold uppercase tracking-[0.03em] text-on-orange"
          >
            Send me a login link
          </button>
        </form>

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
