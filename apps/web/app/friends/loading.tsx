import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

/** Loading skeleton for the Friends tab. */
export default function FriendsLoading() {
  return (
    <AppShell tab>
      <div className="flex min-h-full flex-col gap-5 pt-1">
        <Skeleton className="h-7 w-40 rounded-chip" />
        <div className="flex flex-col gap-3 rounded-panel bg-[#0b1238] p-4">
          <Skeleton className="h-5 w-56 rounded-chip" />
          <Skeleton className="h-4 w-64 rounded-chip" />
          <Skeleton className="h-11 w-full rounded-button" />
          <Skeleton className="h-11 w-full rounded-button" />
        </div>
        <Skeleton className="h-4 w-36 rounded-chip" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-tile bg-panel p-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-28 rounded-chip" />
                <Skeleton className="h-3 w-20 rounded-chip" />
              </div>
              <Skeleton className="h-5 w-10 rounded-chip" />
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
