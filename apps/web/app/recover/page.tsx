import { Logo } from '@/components/brand/Logo';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** A12 · Recover access — sign in with another linked method (docs/product-spec.md section 12). */
export default function Recover() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size={48} />
      <h1 className="font-head text-2xl font-extrabold">Recover access</h1>
      <p className="max-w-xs text-sm text-ink-2">Sign in with any method linked to your account.</p>
      <div className="w-full max-w-xs space-y-3">
        <PrimaryButton href="/api/auth/google/begin">Continue with Google</PrimaryButton>
        <OutlineButton href="/login/email">Continue with email</OutlineButton>
      </div>
      <p className="max-w-xs text-xs text-ink-3">
        None of these work? Contact [your-domain]/support and confirm a connected service.
      </p>
    </main>
  );
}
