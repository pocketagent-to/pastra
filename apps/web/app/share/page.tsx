import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/data';
import { ShareClient } from './ShareClient';

export const dynamic = 'force-dynamic';

/** B7 · Share (docs/product-spec.md section 11). */
export default async function Share() {
  const user = await requireUser();
  return (
    <AppShell back="/pass" title="Share" className="flex flex-col">
      <ShareClient handle={user.handle ?? ''} />
    </AppShell>
  );
}
