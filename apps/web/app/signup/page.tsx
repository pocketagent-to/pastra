import { Logo } from '@/components/brand/Logo';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/**
 * Sign up (A1). Two methods only — Google and email magic link (docs/product-spec.md section 4).
 * This is the layout; the auth wiring lands in stage 3. Continuing accepts Terms and Privacy.
 */
export default function SignUp() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <Logo size={56} />
      <div className="space-y-2">
        <h1 className="font-head text-3xl font-extrabold tracking-tight">Get your pass</h1>
        <p className="max-w-xs text-sm text-ink-2">
          Six sides of your life in one hexagon, plus a crypto card.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <PrimaryButton href="/api/auth/google/begin">Continue with Google</PrimaryButton>
        <OutlineButton href="/login/email">Continue with email</OutlineButton>
      </div>

      <p className="max-w-xs text-xs text-ink-3">
        By continuing you accept our{' '}
        <a href="/terms" className="underline">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="underline">
          Privacy
        </a>
        .
      </p>
    </main>
  );
}
