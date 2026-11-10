import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Toggle } from '@/components/ui/Toggle';

const ROWS = [
  { href: '/settings/profile', label: 'Edit profile' },
  { href: '/settings/sign-in', label: 'Sign-in methods' },
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
];

/** G1 · Settings (docs/product-spec.md section 12). */
export default function SettingsScreen() {
  return (
    <AppShell back="/pass" title="Settings">
      <div className="space-y-6 pt-2">
        <section className="divide-y divide-divider rounded-panel border border-divider bg-panel">
          {ROWS.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="flex items-center justify-between p-4 hover:opacity-80"
            >
              <span>{r.label}</span>
              <span className="text-ink-3">›</span>
            </Link>
          ))}
        </section>

        <section className="space-y-1 rounded-panel border border-divider bg-panel p-4">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Personalised offers</span>
            <Toggle />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Notify me on Telegram</span>
            <Toggle />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm">Notify me by email</span>
            <Toggle defaultOn />
          </div>
        </section>

        <section className="divide-y divide-divider rounded-panel border border-divider bg-panel">
          <form action="/api/me/export" method="post" className="p-4">
            <button type="submit" className="text-sm text-ink-2">
              Download my data
            </button>
          </form>
          <form action="/api/auth/logout" method="post" className="p-4">
            <button type="submit" className="text-sm text-ink-2">
              Log out
            </button>
          </form>
          <Link href="/settings/delete" className="block p-4 text-sm text-orange-light">
            Delete account
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
