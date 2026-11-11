import Link from 'next/link';

/** A nested-screen header: a square back button and an uppercase title (design/Category.html). */
export function BackHeader({ title, back = '/pass' }: { title: string; back?: string }) {
  return (
    <header className="app-shell pwa-safe-top flex items-center gap-3.5 bg-[#16171B] px-5 pb-3.5">
      <Link
        href={back}
        aria-label="Back"
        className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-white"
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
      </Link>
      <h1 className="font-head text-base font-extrabold uppercase tracking-[0.04em]">{title}</h1>
    </header>
  );
}
