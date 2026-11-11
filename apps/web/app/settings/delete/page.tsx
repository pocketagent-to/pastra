import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/data';
import { DeleteConfirmForm } from './DeleteConfirmForm';

export const dynamic = 'force-dynamic';

const WHAT_GETS_DELETED = [
  'Your pass, level and stamps',
  'All data from connected services',
  'Your public pass page and share links',
  'Your card, once you have closed it',
];

/** G3 · Delete account (design/DeleteConfirm.html, docs/product-spec.md section 14). */
export default async function DeleteAccountScreen() {
  await requireUser();

  return (
    <AppShell back="/settings" title="Delete account">
      <div className="flex flex-1 flex-col gap-[22px] pt-2">
        <div className="flex flex-col gap-2.5">
          <div className="font-head text-2xl font-extrabold uppercase leading-[1.2]">
            Delete everything?
          </div>
          <div className="text-[15px] leading-relaxed text-ink-2">
            This removes your account and cannot be undone.
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold tracking-[0.05em]">WHAT GETS DELETED</div>
          <div className="flex flex-col rounded-panel bg-panel px-4">
            {WHAT_GETS_DELETED.map((line, i) => (
              <div
                key={line}
                className={`flex min-h-12 items-center text-[14px] ${
                  i > 0 ? 'border-t border-divider' : ''
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        </div>

        <DeleteConfirmForm />
      </div>
    </AppShell>
  );
}
