import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';

const SHORT_VERSION = [
  'We read only what you approve, service by service',
  'We never sell your data',
  'Offer partners get no personal data from us',
  'Health data: totals only, and only with your separate consent',
  'You can download or delete everything at any time',
];

const SECTIONS = [
  {
    title: 'What we collect',
    body: 'Your sign-in details, and from each connected service the items listed on its consent screen. From wallets: public history only, never balances.',
  },
  {
    title: 'Why we use it',
    body: 'To build your pass, level and stamps, to update them weekly, and to pick offers if you have offers turned on.',
  },
  {
    title: 'Who sees it',
    body: 'Only you, plus whatever you choose to show on your public pass. The card partner receives identity documents you submit to them, not your pass data.',
  },
  {
    title: 'How long we keep it',
    body: 'Until you disconnect a service or delete your account. Then it is erased within [RETENTION PERIOD].',
  },
  {
    title: 'Your rights',
    body: 'Access, correction, export, deletion and withdrawal of consent. Most of these are one tap in Settings.',
  },
  {
    title: 'Contact',
    body: '[DATA CONTROLLER], [ADDRESS]. Privacy questions: [PRIVACY EMAIL]. You may also complain to [SUPERVISORY AUTHORITY].',
  },
];

/** G6 · Privacy (draft — needs a lawyer; placeholders stay). */
export default function Privacy() {
  return (
    <AppShell back="/settings" title="Privacy">
      <div className="flex min-h-full flex-col gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="font-head text-2xl font-extrabold uppercase leading-[1.2]">
            Privacy policy
          </h1>
          <p className="text-[13px] text-ink-3">Last updated [DATE] · [DATA CONTROLLER]</p>
        </div>

        <div className="flex flex-col gap-3 rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
          <div className="font-head text-[13px] font-bold tracking-[0.05em]">THE SHORT VERSION</div>
          {SHORT_VERSION.map((item) => (
            <div key={item} className="flex gap-2.5 text-sm leading-[1.45]">
              <svg
                viewBox="0 0 20 20"
                width="20"
                height="20"
                aria-hidden="true"
                className="shrink-0 text-green"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 10l4 4 8-9" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} className="flex flex-col gap-1.5">
            <h2 className="font-head text-[13px] font-bold uppercase">{s.title}</h2>
            <p className="text-sm leading-[1.55] text-ink-2">{s.body}</p>
          </section>
        ))}

        <div className="mt-auto flex flex-col gap-2.5">
          <Link
            href="/settings"
            className="flex h-[52px] items-center justify-center rounded-button bg-blue font-head text-[13px] font-bold uppercase tracking-[0.03em] text-ink"
          >
            Manage my data in Settings
          </Link>
          <Link
            href="/terms"
            className="flex min-h-[44px] items-center justify-center text-sm text-ink-2"
          >
            Read the terms of use
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
