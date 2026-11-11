import { cn } from '@/lib/cn';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { AppHeader } from './AppHeader';
import { BackHeader } from './BackHeader';
import { BottomNav } from './BottomNav';

/**
 * Page shell: a 390–430px centred column on the gradient background. A top-level tab shows the app
 * header and bottom nav; a nested screen shows a back header instead (docs/architecture.md §13).
 */
export function AppShell({
  children,
  tab = false,
  back,
  title,
  className,
}: {
  children: React.ReactNode;
  tab?: boolean;
  back?: string;
  title?: string;
  className?: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <InstallBanner />
      {tab ? <AppHeader /> : <BackHeader title={title ?? ''} back={back} />}
      <main className={cn('app-shell flex-1 px-4 pb-6', className)}>{children}</main>
      {tab && <BottomNav />}
    </div>
  );
}
