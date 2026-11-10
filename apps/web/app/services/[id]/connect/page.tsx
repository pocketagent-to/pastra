import { notFound } from 'next/navigation';
import { catalog, type ProviderId } from '@pastra/catalog';
import { AppShell } from '@/components/layout/AppShell';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { ConsentList } from '@/components/ui/ConsentList';
import { PrimaryButton } from '@/components/ui/Button';
import { HealthConsentForm } from './HealthConsentForm';

/** A6 · Connect — consent (docs/product-spec.md section 12). Health services need a checkbox. */
export default async function ConnectConsent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = catalog.providerById.get(id as ProviderId);
  if (!provider) notFound();

  return (
    <AppShell back="/services" title={`Connect ${provider.name}`}>
      <div className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <ServiceLogo provider={provider.id} name={provider.name} size={48} />
          <div>
            <div className="font-head text-lg font-bold">{provider.name}</div>
            <div className="text-xs text-ink-3">Official authorisation, read-only.</div>
          </div>
        </div>

        <ConsentList weRead={provider.consent.weRead} weNever={provider.consent.weNever} />

        {provider.health ? (
          <HealthConsentForm providerId={provider.id} />
        ) : (
          <PrimaryButton href={`/api/connections/${provider.id}/begin`}>
            Continue to {provider.name}
          </PrimaryButton>
        )}
      </div>
    </AppShell>
  );
}
