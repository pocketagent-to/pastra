import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { PromoCode } from '@/components/ui/PromoCode';
import { AXIS_SHORT } from '@/lib/axes';
import { requireUser } from '@/lib/data';
import { EXAMPLE_OFFERS } from '@/lib/example';

export const dynamic = 'force-dynamic';

/** D4 / D5 · Offer detail — promo code or cashback (docs/product-spec.md section 12). */
export default async function OfferDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const offer = EXAMPLE_OFFERS.find((o) => o.id === id);
  if (!offer) notFound();

  const badge = AXIS_SHORT[offer.axis];

  if (offer.type === 'promo') {
    return (
      <AppShell back="/offers" title="Offer" className="flex flex-col">
        <div className="flex flex-1 flex-col gap-[22px] pt-2">
          <div className="flex flex-col items-start gap-3">
            <span className="rounded-[8px] bg-blue px-2.5 py-[5px] font-head text-[10px] font-bold uppercase tracking-[0.06em]">
              {badge}
            </span>
            <h1 className="font-head text-2xl font-extrabold uppercase leading-tight">
              {offer.headline}
            </h1>
            {offer.reason && (
              <p className="text-[15px] leading-relaxed text-ink-2">{offer.reason}</p>
            )}
          </div>

          <PromoCode code="[PROMO-CODE]" />

          <div className="flex flex-col rounded-panel bg-panel px-4 py-1">
            <div className="flex min-h-12 items-center text-sm">
              <span className="flex-1 text-ink-2">Partner</span>
              <span className="font-semibold">[PARTNER]</span>
            </div>
            <div className="flex min-h-12 items-center border-t border-divider text-sm">
              <span className="flex-1 text-ink-2">Valid until</span>
              <span className="font-semibold">Next drop · 2 days</span>
            </div>
            <div className="flex min-h-12 items-center border-t border-divider text-sm">
              <span className="flex-1 text-ink-2">Terms</span>
              <span className="font-semibold">[OFFER TERMS]</span>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <Link
              href="#partner"
              className="flex h-14 items-center justify-center rounded-button bg-orange font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
            >
              Go to partner site
            </Link>
            <p className="text-center text-xs leading-relaxed text-ink-3">
              The partner sees only that a code was used. They never get your data.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back="/offers" title="Offer" className="flex flex-col">
      <div className="flex flex-1 flex-col gap-[22px] pt-2">
        <div className="flex flex-col gap-2.5">
          <span className="self-start rounded-chip bg-[linear-gradient(90deg,#3D6BFF,#6A3DFF)] px-3.5 py-2 font-head text-[11px] font-bold uppercase tracking-[0.05em]">
            {badge}
          </span>
          <h1 className="text-gradient font-head text-2xl font-extrabold uppercase leading-tight">
            {offer.headline}
          </h1>
          {offer.reason && <p className="text-[15px] leading-relaxed text-ink-2">{offer.reason}</p>}
        </div>

        <div className="flex flex-col rounded-panel bg-panel px-4 py-1">
          <div className="flex min-h-[52px] items-center justify-between gap-3 text-sm">
            <span className="text-ink-2">Status</span>
            <span className="text-right font-semibold text-orange-light">Not active yet</span>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider text-sm">
            <span className="text-ink-2">Where</span>
            <span className="text-right font-semibold">[PARTNER]</span>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider text-sm">
            <span className="text-ink-2">Valid until</span>
            <span className="text-right font-semibold">Next drop · 2 days</span>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider text-sm">
            <span className="text-ink-2">Cashback limit</span>
            <span className="text-right font-semibold">[LIMIT]</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
            How it works
          </div>
          {[
            'Activate this offer',
            'Pay with your Pastra card at the partner',
            'Cashback lands when the payment settles',
          ].map((step, i) => (
            <div key={step} className="flex items-center gap-3 text-sm">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-blue font-head text-xs font-bold">
                {i + 1}
              </span>
              {step}
            </div>
          ))}
        </div>

        <p className="text-[13px] leading-relaxed text-ink-3">[OFFER TERMS]</p>

        <div className="mt-auto flex flex-col gap-2.5">
          <Link
            href="#activate"
            className="flex h-14 items-center justify-center rounded-button font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
            style={{ background: 'var(--grad-button)' }}
          >
            Activate
          </Link>
          <p className="text-center text-[13px] leading-relaxed text-ink-3">
            The partner sees a card payment, nothing else. They never get your data.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
