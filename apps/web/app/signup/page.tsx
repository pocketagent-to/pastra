import { getConfig } from '@pastra/config';
import { catalog, type ProviderId } from '@pastra/catalog';
import { Logo } from '@/components/brand/Logo';
import { OutlineButton } from '@/components/ui/Button';
import { PrivyLogin } from '@/components/auth/PrivyLogin';
import { Hexagon } from '@/components/ui/Hexagon';
import { ServiceLogo } from '@/components/ui/ServiceLogo';

export const dynamic = 'force-dynamic';

/** A few recognisable services, as a taste of what builds your hexagon. */
const POPULAR: Array<{ id: ProviderId; name: string }> = [
  { id: 'steam', name: 'Steam' },
  { id: 'discord', name: 'Discord' },
  { id: 'github', name: 'GitHub' },
  { id: 'x', name: 'X' },
  { id: 'tidal', name: 'TIDAL' },
  { id: 'wallet_evm', name: 'EVM wallet' },
];

/**
 * Sign up (A1). Real sign-in is Privy (email + Google) which also provisions the embedded wallet
 * (docs/architecture.md section 11.1). In development a gated dev-login shortcut is used for e2e.
 */
export default function SignUp() {
  const config = getConfig();
  const privyConfigured = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const devLogin = config.DEV_LOGIN_ENABLED && config.NODE_ENV === 'development';
  const moreCount = Math.max(0, catalog.providers.length - POPULAR.length);

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

        {/* Taste of the result: connect services → your hexagon + level. */}
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-2">
          <Hexagon
            values={{ sports: 34, gaming: 84, crypto: 58, music: 46, social: 66, lifestyle: 52 }}
            size={190}
            showLabels={false}
            showValues={false}
          />
          <p className="max-w-[300px] text-center text-[14px] leading-relaxed text-ink-2">
            Connect the services you already use — HEXTRA turns them into your hexagon and your
            level.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {POPULAR.map((p) => (
              <span
                key={p.id}
                className="flex h-11 w-11 items-center justify-center rounded-tile border border-divider bg-panel"
              >
                <ServiceLogo provider={p.id} name={p.name} size={26} />
              </span>
            ))}
            {moreCount > 0 && (
              <span className="flex h-11 items-center rounded-tile border border-divider bg-panel px-3.5 text-[13px] font-semibold text-ink-3">
                +{moreCount}
              </span>
            )}
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-ink-3">
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
