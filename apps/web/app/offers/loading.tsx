import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

/** Loading skeleton for the Offers tab. */
export default function OffersLoading() {
  return (
    <AppShell tab>
      <div className="flex min-h-full flex-col gap-5 pt-1">
        <div className="flex flex-col items-center gap-3 text-center">
          <Skeleton className="h-6 w-20 rounded-chip" />
          <Skeleton className="h-7 w-56 rounded-chip" />
          <Skeleton className="h-[120px] w-full max-w-[300px] rounded-panel" />
        </div>
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-32 rounded-chip" />
          <Skeleton className="mt-1 h-3.5 w-52 rounded-chip" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-panel bg-panel p-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-16 rounded-lg" />
                <Skeleton className="h-4 w-24 rounded-chip" />
              </div>
              <Skeleton className="h-5 w-3/4 rounded-chip" />
              <Skeleton className="h-4 w-1/2 rounded-chip" />
              <Skeleton className="h-10 w-full rounded-button" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
