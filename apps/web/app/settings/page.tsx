import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/data';
import { PreferenceToggle } from './PreferenceToggle';

export const dynamic = 'force-dynamic';

function RowArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      className="shrink-0 text-orange"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** G1 · Settings (docs/product-spec.md section 12). */
export default async function SettingsScreen() {
  const user = await requireUser();
  return (
    <AppShell back="/pass" title="Settings">
      <div className="flex flex-col gap-6 pt-2">
        <section className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">Profile</div>
          <div className="divide-y divide-divider rounded-panel bg-panel px-4">
            <Link
              href="/settings/profile"
              className="flex min-h-16 items-center justify-between gap-3"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">Edit profile</span>
                <span className="text-xs text-ink-3">Name, photo and who sees each side</span>
              </span>
              <RowArrow />
            </Link>
            <Link
              href="/settings/sign-in"
              className="flex min-h-16 items-center justify-between gap-3"
            >
              <span className="text-[15px] font-semibold">Sign-in methods</span>
              <RowArrow />
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
            Offers and updates
          </div>
          <div className="divide-y divide-divider rounded-panel bg-panel px-4">
            <div className="flex min-h-[60px] items-center justify-between gap-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px]">Offers based on my activity</span>
                <span className="text-xs text-ink-3">Partners never see your data</span>
              </span>
              <PreferenceToggle
                field="offersConsent"
                label="Offers based on my activity"
                defaultOn={user.offersConsent}
              />
            </div>
            <div className="flex min-h-[52px] items-center justify-between gap-3">
              <span className="text-[15px]">Weekly drop in Telegram</span>
              <PreferenceToggle
                field="notifyTelegram"
                label="Weekly drop in Telegram"
                defaultOn={user.notifyTelegram}
              />
            </div>
            <div className="flex min-h-[52px] items-center justify-between gap-3">
              <span className="text-[15px]">Weekly drop by email</span>
              <PreferenceToggle
                field="notifyEmail"
                label="Weekly drop by email"
                defaultOn={user.notifyEmail}
              />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">Account</div>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/services"
              className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-semibold"
            >
              Manage connected services
            </Link>
            <form action="/api/me/export" method="post">
              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-semibold"
              >
                Download my data
              </button>
            </form>
            <Link
              href="/privacy"
              className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-semibold"
            >
              Privacy policy
            </Link>
            <Link
              href="/terms"
              className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-semibold"
            >
              Terms of use
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="flex h-[52px] w-full items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-semibold"
              >
                Log out
              </button>
            </form>
            <Link
              href="/settings/delete"
              className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-[#FF8A7A] text-[15px] font-semibold text-[#FF8A7A]"
            >
              Delete account and all data
            </Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
