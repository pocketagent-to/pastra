import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

/** Loading skeleton for the Card tab. */
export default function CardLoading() {
  return (
    <AppShell tab>
      <div className="flex min-h-full flex-col gap-5 pt-1">
        <Skeleton className="aspect-[1.586/1] w-full rounded-card" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-tile" />
          ))}
        </div>
        <div className="rounded-panel bg-panel px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-4">
              <Skeleton className="h-4 w-32 rounded-chip" />
              <Skeleton className="h-4 w-16 rounded-chip" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
