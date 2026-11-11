import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AxisLoading() {
  return (
    <AppShell back="/pass">
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex items-end justify-between gap-3">
          <Skeleton className="h-16 w-28 rounded-chip" />
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-4 w-20 rounded-chip" />
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-panel bg-panel p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32 rounded-chip" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-5 w-40 rounded-chip" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-tile" />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
