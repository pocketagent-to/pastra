import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';

const SECTIONS = [
  {
    title: '1. What Pastra is',
    body: 'Pastra builds a personal pass from services you choose to connect and shows weekly offers based on your activity.',
  },
  {
    title: '2. Your account',
    body: 'One account per person. You must be [MINIMUM AGE] or older. Keep your sign-in methods safe.',
  },
  {
    title: '3. Connected services',
    body: 'You allow us to read the data listed on each consent screen. You can disconnect a service at any time, and its data is then deleted.',
  },
  {
    title: '4. Levels, stamps and scores',
    body: 'They reflect activity in connected services. They have no monetary value and the way they are calculated may change.',
  },
  {
    title: '5. Offers',
    body: "Offers come from partners, change every week and can end early. The partner's own terms apply to each offer.",
  },
  {
    title: '6. The card',
    body: 'The card is issued by [ISSUER LEGAL NAME] under its own agreement. Identity verification is required. Availability depends on your country.',
  },
  {
    title: "7. What's not allowed",
    body: "Connecting accounts that aren't yours, faking activity, or running several accounts to collect offers. We may close accounts that do this.",
  },
  {
    title: '8. Contact',
    body: '[LEGAL ENTITY], [REGISTERED ADDRESS], [CONTACT EMAIL]. Governing law: [JURISDICTION].',
  },
];

/** G5 · Terms (draft — needs a lawyer; placeholders stay). */
export default function Terms() {
  return (
    <AppShell back="/settings" title="Terms">
      <div className="flex min-h-full flex-col gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="font-head text-2xl font-extrabold uppercase leading-[1.2]">
            Terms of use
          </h1>
          <p className="text-[13px] text-ink-3">Last updated [DATE] · [LEGAL ENTITY]</p>
        </div>

        {SECTIONS.map((s) => (
          <section key={s.title} className="flex flex-col gap-1.5">
            <h2 className="font-head text-[13px] font-bold uppercase">{s.title}</h2>
            <p className="text-sm leading-[1.55] text-ink-2">{s.body}</p>
          </section>
        ))}

        <Link
          href="/privacy"
          className="mt-auto flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink font-head text-[13px] font-bold uppercase tracking-[0.03em]"
        >
          Read the privacy policy
        </Link>
      </div>
    </AppShell>
  );
}
