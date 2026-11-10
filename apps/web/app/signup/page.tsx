import { getConfig } from '@pastra/config';
import { Logo } from '@/components/brand/Logo';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

/**
 * Sign up (A1). Real sign-in is Privy (email + Google) which also provisions the embedded wallet
 * (docs/architecture.md section 11.1). The server side (/api/auth/privy) is wired; the client
 * provider is activated once Privy keys are added (see README "Enabling Privy"). In development a
 * gated dev-login shortcut is used for end-to-end testing.
 */
export default function SignUp() {
  const config = getConfig();
  const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const devLogin = config.DEV_LOGIN_ENABLED && config.NODE_ENV === 'development';

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
        {devLogin ? (
          <>
            <PrimaryButton href="/api/auth/dev-login?handle=nomad">
              Dev sign-in as nomad
            </PrimaryButton>
            <OutlineButton href="/api/auth/dev-login?handle=newplayer">
              Dev: new account
            </OutlineButton>
            {privyConfigured && (
              <p className="text-xs text-ink-3">
                Privy is configured — wire the client (see README).
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-3">
            Sign in with Privy (email or Google). Enable the client per the README.
          </p>
        )}
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
