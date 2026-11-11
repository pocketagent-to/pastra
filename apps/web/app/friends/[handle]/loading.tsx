import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';

export default function FriendLoading() {
  return (
    <AppShell back="/friends" title="Friend">
      <div className="flex flex-col items-center gap-4 pt-2">
        <Skeleton className="h-[72px] w-[72px] rounded-full" />
        <Skeleton className="h-7 w-40 rounded-chip" />
        <Skeleton className="h-4 w-48 rounded-chip" />
        <div className="w-full rounded-panel bg-panel p-4">
          <Skeleton className="mx-auto h-[250px] w-full max-w-[320px] rounded-panel" />
        </div>
        <Skeleton className="h-[54px] w-full rounded-button" />
        <Skeleton className="h-[54px] w-full rounded-button" />
      </div>
    </AppShell>
  );
}
