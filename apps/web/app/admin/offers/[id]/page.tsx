import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AXES, catalog } from '@pastra/catalog';
import { getOffer, isAdmin, listMerchants } from '@pastra/core';
import { getConfig } from '@pastra/config';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';
import { OfferEditForm } from './OfferEditForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AXIS_LABEL: Record<string, string> = {
  sports: 'Sports',
  gaming: 'Gaming',
  crypto: 'Crypto',
  music: 'Music & Entertainment',
  social: 'Social',
  lifestyle: 'Lifestyle',
};

function AdminHeader() {
  return (
    <header className="flex items-center gap-7 bg-panel px-8 py-[14px]">
      <div className="flex items-center gap-2.5">
        <svg viewBox="0 0 120 120" width="32" height="32" aria-hidden="true">
          <rect width="120" height="120" rx="30" fill="#1F4BFF" />
          <g transform="translate(60 60) scale(0.74) translate(-60 -60)">
            <polygon
              points="60,10 103.3,35 103.3,85 60,110 16.7,85 16.7,35"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="9"
              strokeLinejoin="round"
            />
            <polygon
              points="60,46.7 91.3,41.9 88,76.2 60,79 40.3,71.4 50.1,54.3"
              fill="#FF6B2C"
              stroke="#FF6B2C"
              strokeWidth="3"
              strokeLinejoin="round"
            />
          </g>
        </svg>
        <div className="font-head text-base font-extrabold tracking-[0.04em]">HEXTRA</div>
      </div>
      <div className="rounded-lg bg-divider px-2.5 py-[5px] text-xs font-semibold text-ink-2">
        ADMIN
      </div>
      <nav className="flex flex-grow gap-1.5">
        <Link
          href="/admin/offers"
          className="flex min-h-11 items-center rounded-[10px] bg-blue px-3.5 text-sm font-semibold text-ink"
        >
          Offers
        </Link>
        <Link
          href="/admin/offers"
          className="flex min-h-11 items-center rounded-[10px] px-3.5 text-sm font-semibold text-ink-2"
        >
          Merchants
        </Link>
        <Link
          href="/admin/offers"
          className="flex min-h-11 items-center rounded-[10px] px-3.5 text-sm font-semibold text-ink-2"
        >
          Promo codes
        </Link>
        <Link
          href="/admin/offers"
          className="flex min-h-11 items-center rounded-[10px] px-3.5 text-sm font-semibold text-ink-2"
        >
          Drops
        </Link>
      </nav>
      <div className="text-[13px] text-ink-3">[ADMIN EMAIL]</div>
    </header>
  );
}

/** Admin — edit offer with a condition builder (docs/product-spec.md section 10). */
export default async function AdminOfferEdit({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!isAdmin(getConfig(), user)) notFound();

  const { id } = await params;
  const isNew = id === 'new';
  const db = getDb();

  const offer = isNew ? null : await getOffer(db, id);
  if (!isNew && !offer) notFound();

  const merchants = await listMerchants(db);

  const options = {
    providers: catalog.providers.map((p) => ({ id: p.id, name: p.name })),
    metrics: Array.from(catalog.metricById.values())
      .filter((m) => !catalog.providerById.get(m.provider)?.health)
      .map((m) => ({ key: m.key, label: m.label })),
    axes: AXES.map((a) => ({ code: a, label: AXIS_LABEL[a] ?? a })),
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0C10] text-ink">
      <AdminHeader />
      <OfferEditForm
        isNew={isNew}
        offerId={isNew ? null : id}
        offer={offer}
        merchantNames={merchants.map((m) => m.name)}
        options={options}
      />
    </div>
  );
}
