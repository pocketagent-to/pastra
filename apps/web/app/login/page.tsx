import { Logo } from '@/components/brand/Logo';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** A11 · Log in — Google and email only (docs/product-spec.md section 12). */
export default function Login() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo size={48} />
      <h1 className="font-head text-2xl font-extrabold">Welcome back</h1>
      <div className="w-full max-w-xs space-y-3">
        <PrimaryButton href="/api/auth/google/begin">Continue with Google</PrimaryButton>
        <OutlineButton href="/login/email">Continue with email</OutlineButton>
      </div>
      <a href="/recover" className="text-xs text-ink-3 underline">
        Can&rsquo;t sign in?
      </a>
    </main>
  );
}
