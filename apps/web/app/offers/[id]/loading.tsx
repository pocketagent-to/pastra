import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function OfferLoading() {
  return (
    <AppShell back="/offers" title="Offer">
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-6 w-20 rounded-lg" />
        <Skeleton className="h-7 w-3/4 rounded-chip" />
        <Skeleton className="h-4 w-1/2 rounded-chip" />
        <Skeleton className="h-28 rounded-panel" />
        <Skeleton className="h-[120px] rounded-panel" />
        <Skeleton className="h-[54px] w-full rounded-button" />
      </div>
    </AppShell>
  );
}
