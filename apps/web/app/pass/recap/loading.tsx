import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function RecapLoading() {
  return (
    <AppShell back="/pass" title="Weekly recap">
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-6 w-24 rounded-chip" />
        <Skeleton className="h-8 w-56 rounded-chip" />
        <Skeleton className="h-24 rounded-panel" />
        <Skeleton className="h-[280px] rounded-panel" />
        <Skeleton className="h-20 rounded-panel" />
      </div>
    </AppShell>
  );
}
