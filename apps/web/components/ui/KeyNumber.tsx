import type { ProviderId } from '@pastra/catalog';
import { catalog } from '@pastra/catalog';
import { ServiceLogo } from './ServiceLogo';

/** One "Your numbers" row (design/Main.html): orange value, label, and the source service. */
export function KeyNumber({
  value,
  label,
  provider,
}: {
  value: string;
  label: string;
  provider?: string;
}) {
  const svc = provider ? catalog.providerById.get(provider as ProviderId) : undefined;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 font-head text-[17px] font-bold text-orange">{value}</span>
      <span className="flex-1 text-sm text-ink">{label}</span>
      {svc && (
        <span className="flex items-center gap-1.5 text-xs text-ink-3">
          <ServiceLogo provider={svc.id} name={svc.name} size={24} />
          {svc.name}
        </span>
      )}
    </div>
  );
}
