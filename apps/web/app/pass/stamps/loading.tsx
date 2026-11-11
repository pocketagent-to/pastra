import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function StampsLoading() {
  return (
    <AppShell back="/pass" title="Stamps">
      <div className="flex flex-col gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32 rounded-chip" />
          <Skeleton className="h-4 w-56 rounded-chip" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-tile" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
