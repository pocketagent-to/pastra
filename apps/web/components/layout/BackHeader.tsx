import Link from 'next/link';

/** A nested-screen header: a back link and a title (replaces the bottom nav). */
export function BackHeader({ title, back = '/pass' }: { title: string; back?: string }) {
  return (
    <header className="app-shell flex items-center gap-3 px-4 py-3">
      <Link
        href={back}
        aria-label="Back"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-panel text-ink-2"
      >
        ←
      </Link>
      <h1 className="font-head text-lg font-bold">{title}</h1>
    </header>
  );
}
