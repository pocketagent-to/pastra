import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PromoCode } from '@/components/ui/PromoCode';
import { PrimaryButton } from '@/components/ui/Button';
import { AXIS_LABEL } from '@/lib/axes';
import { EXAMPLE_OFFERS } from '@/lib/example';

/** D4 / D5 · Offer detail — promo code or cashback (docs/product-spec.md section 12). */
export default async function OfferDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const offer = EXAMPLE_OFFERS.find((o) => o.id === id);
  if (!offer) notFound();

  return (
    <AppShell back="/offers" title={offer.merchant}>
      <div className="space-y-6 pt-2">
        <div className="rounded-panel border border-divider bg-panel p-5 text-center">
          <div className="font-head text-4xl font-extrabold text-orange">{offer.headline}</div>
          <div className="mt-1 text-sm text-ink-3">{AXIS_LABEL[offer.axis]}</div>
        </div>

        {offer.reason && <p className="text-sm text-ink-2">{offer.reason}</p>}

        {offer.type === 'promo' ? (
          <div className="space-y-3">
            <PromoCode code="PASTRA10" />
            <PrimaryButton href="#">Go to [PARTNER C]</PrimaryButton>
          </div>
        ) : (
          <PrimaryButton href="#">Activate</PrimaryButton>
        )}

        <p className="text-xs text-ink-3">{offer.endsLabel}. Terms: [TERMS].</p>
      </div>
    </AppShell>
  );
}
