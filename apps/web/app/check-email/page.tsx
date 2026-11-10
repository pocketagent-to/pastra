import { Logo } from '@/components/brand/Logo';
import { OutlineButton } from '@/components/ui/Button';

/** A2 · Check your email (docs/product-spec.md section 12). */
export default function CheckEmail() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo size={48} />
      <h1 className="font-head text-2xl font-extrabold">Check your email</h1>
      <p className="max-w-xs text-sm text-ink-2">
        We sent a sign-in link to your inbox. It expires in 15 minutes.
      </p>
      <div className="w-full max-w-xs space-y-3">
        <OutlineButton href="/signup">Use a different address</OutlineButton>
        <p className="text-xs text-ink-3">Didn&rsquo;t get it? You can resend in 60 seconds.</p>
      </div>
    </main>
  );
}
