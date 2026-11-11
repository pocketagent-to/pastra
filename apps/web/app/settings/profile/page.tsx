import { getVisibility } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';
import { EditProfileForm } from './EditProfileForm';

export const dynamic = 'force-dynamic';

type VisLevel = 'everyone' | 'friends' | 'me';

/** B · Edit profile (docs/product-spec.md section 12, design/EditProfile.html). */
export default async function EditProfilePage() {
  const user = await requireUser();
  const visRows = await getVisibility(getDb(), user.id);
  const visibility: Partial<Record<string, VisLevel>> = {};
  for (const row of visRows) visibility[row.axis] = row.level as VisLevel;

  return (
    <AppShell back="/settings" title="Edit profile">
      <EditProfileForm
        initial={{
          displayName: user.displayName ?? '',
          handle: user.handle ?? '',
          bio: user.bio ?? '',
          visibility,
          show: {
            level: user.showLevel,
            stamps: user.showStamps,
            numbers: user.showNumbers,
            bio: user.showBio,
          },
        }}
      />
    </AppShell>
  );
}
