import { getIdentities, type IdentitySummary } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';

export const dynamic = 'force-dynamic';

const KIND_LABEL: Record<IdentitySummary['kind'], string> = {
  email: 'Email',
  google: 'Google',
};

function IdentityRow({ identity, withBorder }: { identity: IdentitySummary; withBorder: boolean }) {
  return (
    <div
      className={`flex min-h-[72px] items-center justify-between gap-3 ${
        withBorder ? 'border-t border-divider' : ''
      }`}
    >
      <span className="flex flex-col gap-1">
        <span className="text-[15px] font-semibold">{KIND_LABEL[identity.kind]}</span>
        {!identity.connected && <span className="text-[13px] text-ink-3">Not added yet</span>}
      </span>
      {identity.connected ? (
        <span className="flex items-center gap-2.5">
          <span className="text-[12px] font-semibold text-green">Added</span>
          <button
            type="button"
            className="min-h-11 rounded-chip border-[1.5px] border-white px-3.5 text-[13px] font-semibold"
          >
            Change
          </button>
        </span>
      ) : (
        <button
          type="button"
          className="min-h-11 rounded-chip bg-orange px-[18px] text-[13px] font-bold text-on-orange"
        >
          Add
        </button>
      )}
    </div>
  );
}

/** Sign-in methods (docs/architecture.md section 6, design/LoginMethods.html). */
export default async function SignInMethodsPage() {
  const user = await requireUser();
  const identities = await getIdentities(getDb(), user.id);

  return (
    <AppShell back="/settings" title="Sign-in methods">
      <div className="flex min-h-full flex-col gap-[22px] pt-2">
        <div className="flex flex-col gap-2.5">
          <div className="font-head text-2xl font-extrabold uppercase leading-tight">
            How you get in
          </div>
          <div className="text-[15px] leading-relaxed text-ink-2">
            Add both, so one lost inbox never locks you out of your pass.
          </div>
        </div>

        <div className="flex flex-col rounded-panel bg-panel px-4">
          {identities.map((identity, i) => (
            <IdentityRow key={identity.kind} identity={identity} withBorder={i > 0} />
          ))}
        </div>

        <div className="text-[13px] leading-relaxed text-ink-3">
          You can remove a method only while the other one is added.
        </div>

        <div className="mt-auto rounded-tile border-[1.5px] border-dashed border-[#6B7080] p-4 text-[13px] leading-relaxed text-ink-2">
          Lost both? Write to [SUPPORT EMAIL]. We&apos;ll ask you to prove you own one of the
          services connected to your pass.
        </div>
      </div>
    </AppShell>
  );
}
