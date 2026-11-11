import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

/** Loading skeleton for the Services tab. */
export default function ServicesLoading() {
  return (
    <AppShell tab>
      <div className="flex min-h-full flex-col gap-5 pt-1">
        <Skeleton className="h-7 w-44 rounded-chip" />
        <Skeleton className="h-4 w-64 rounded-chip" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-tile bg-panel p-4">
              <Skeleton className="h-11 w-11 rounded-tile" />
              <Skeleton className="h-4 w-20 rounded-chip" />
              <Skeleton className="h-3 w-16 rounded-chip" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
