import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import type { ProviderId } from '@pastra/catalog';

// One service per axis to start (docs/product-spec.md section 4). Sub-labels verbatim from the mockup.
const FIRST: Array<{ id: ProviderId; name: string; sub: string }> = [
  { id: 'steam', name: 'Steam', sub: 'Gaming' },
  { id: 'wallet_evm', name: 'Crypto wallet', sub: 'Crypto · balances are never read' },
  { id: 'x', name: 'X', sub: 'Social' },
  { id: 'tidal', name: 'TIDAL', sub: 'Music & Entertainment' },
  { id: 'polar', name: 'Polar', sub: 'Sports' },
];

/** A5 · First service (docs/product-spec.md section 12). */
export default function FirstConnect() {
  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <header className="flex min-h-11 items-center gap-2.5 bg-panel px-5 py-3.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">PASTRA</span>
      </header>

      <main className="flex flex-1 flex-col gap-[22px] px-5 pt-7 pb-6">
        <div className="flex flex-col items-start gap-2.5">
          <span
            className="rounded-[10px] px-3.5 py-1.5 font-head text-[11px] font-bold tracking-[0.06em]"
            style={{ background: 'linear-gradient(90deg,#3D6BFF,#6A3DFF)' }}
          >
            STEP 2 OF 3
          </span>
          <h1 className="text-gradient font-head text-[26px] font-extrabold uppercase leading-[1.15]">
            Pick your first service
          </h1>
          <p className="text-[15px] leading-[1.45] text-ink-2">
            One is enough to see your pass. You can add the rest later.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {FIRST.map((s) => (
            <Link
              key={s.id}
              href={`/services/${s.id}/connect`}
              className="flex min-h-[68px] items-center gap-3.5 rounded-tile bg-panel px-4 py-3"
            >
              <ServiceLogo provider={s.id} name={s.name} size={44} className="bg-white" />
              <span className="flex flex-1 flex-col gap-[3px]">
                <span className="text-base font-semibold">{s.name}</span>
                <span className="text-xs text-ink-3">{s.sub}</span>
              </span>
              <svg
                viewBox="0 0 24 24"
                width={22}
                height={22}
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-orange"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>

        <Link
          href="/services"
          className="mt-auto flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em]"
        >
          See all services
        </Link>
      </main>
    </div>
  );
}
