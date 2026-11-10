/** The "what we read / what we never touch" lists on a consent screen (docs/product-spec.md §14). */
export function ConsentList({ weRead, weNever }: { weRead: string[]; weNever: string[] }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-sm font-semibold text-ink-2">We read</div>
        <ul className="space-y-1.5">
          {weRead.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-green">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-ink-2">We never touch</div>
        <ul className="space-y-1.5">
          {weNever.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-ink-2">
              <span className="mt-0.5 text-orange-light">✕</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
