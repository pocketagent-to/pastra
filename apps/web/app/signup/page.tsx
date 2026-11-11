import { getConfig } from '@pastra/config';
import { Logo } from '@/components/brand/Logo';
import { OutlineButton } from '@/components/ui/Button';
import { PrivyLogin } from '@/components/auth/PrivyLogin';

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
    <main className="app-shell flex min-h-dvh flex-col">
      <header className="flex min-h-11 items-center gap-2.5 bg-[#16171B] px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">HEXTRA</span>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-8">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-gradient font-head text-[28px] font-extrabold uppercase leading-[1.15]">
            Create your pass
          </h1>
          <p className="text-[15px] text-ink-2">Takes about a minute. No card needed.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {privyConfigured ? (
            <PrivyLogin />
          ) : (
            <p className="text-sm text-ink-3">Sign-in is not configured yet.</p>
          )}
          {devLogin && (
            <>
              <div className="flex items-center gap-3 text-[13px] text-ink-3">
                <div className="h-px flex-1 bg-divider" />
                or dev sign-in
                <div className="h-px flex-1 bg-divider" />
              </div>
              <OutlineButton href="/api/auth/dev-login?handle=nomad">Dev: nomad</OutlineButton>
              <OutlineButton href="/api/auth/dev-login?handle=newplayer">
                Dev: new account
              </OutlineButton>
            </>
          )}
        </div>

        <p className="mt-auto text-center text-xs leading-relaxed text-ink-3">
          By continuing you agree to the{' '}
          <a href="/terms" className="text-ink-2">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="text-ink-2">
            Privacy Policy
          </a>
          . We never post on your behalf.
        </p>
      </div>
    </main>
  );
}
