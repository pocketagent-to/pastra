import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

/** Loading skeleton for the Pass tab — chrome is instant, data blocks shimmer, no layout shift. */
export default function PassLoading() {
  return (
    <AppShell tab>
      <div className="flex min-h-full flex-col gap-5 pt-1">
        <Skeleton className="h-[150px] rounded-panel" />
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-48 rounded-chip" />
          <Skeleton className="h-7 w-16 rounded-[10px]" />
        </div>
        <div className="rounded-panel bg-panel p-4">
          <Skeleton className="mx-auto h-[250px] w-full max-w-[320px] rounded-panel" />
        </div>
        <Skeleton className="h-5 w-40 rounded-chip" />
        <div className="rounded-panel bg-panel px-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-5 w-16 rounded-chip" />
              <Skeleton className="h-4 flex-1 rounded-chip" />
              <Skeleton className="h-6 w-6 rounded-chip" />
            </div>
          ))}
        </div>
        <Skeleton className="h-5 w-32 rounded-chip" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-[12px]" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
