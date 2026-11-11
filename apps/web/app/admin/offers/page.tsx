import { notFound } from 'next/navigation';
import Link from 'next/link';
import { catalog, type Condition } from '@pastra/catalog';
import { isAdmin, listOffers, type AdminOffer } from '@pastra/core';
import { getConfig } from '@pastra/config';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIDE_LABEL: Record<string, string> = {
  sports: 'Sports',
  gaming: 'Gaming',
  crypto: 'Crypto',
  music: 'Music & Entertainment',
  social: 'Social',
  lifestyle: 'Lifestyle',
  any: 'Any',
};

const COLUMNS = [
  'Merchant',
  'Offer',
  'Type',
  'Side',
  'Who gets it',
  'Eligible',
  'Shown',
  'Activated',
  'Used',
  'Status',
  '',
];

function typeLabel(offer: AdminOffer): string {
  if (offer.type === 'cashback') return 'Cashback';
  return offer.codeMode ? `Promo · ${offer.codeMode}` : 'Promo';
}

function describeCondition(condition: Condition): string {
  switch (condition.kind) {
    case 'connected': {
      const provider = catalog.providerById.get(condition.provider);
      return `${provider?.name ?? condition.provider} connected`;
    }
    case 'metric_gte': {
      const metric = catalog.metricById.get(condition.metric);
      return `${metric?.label ?? condition.metric} ≥ ${condition.value}`;
    }
    case 'axis_gte':
      return `${SIDE_LABEL[condition.axis] ?? condition.axis} ≥ ${condition.value}`;
    case 'level_gte':
      return `Level ≥ ${condition.value}`;
    case 'country_in':
      return `Country in ${condition.countries.join(', ')}`;
    case 'has_card':
      return 'Has card';
    case 'all_axes_positive':
      return 'All sides > 0';
    case 'rewarded_friends_gte':
      return `Friends ≥ ${condition.value}`;
    case 'all':
      return condition.of.map(describeCondition).join(' · ');
    case 'any':
      return condition.of.map(describeCondition).join(' or ');
    default:
      return '';
  }
}

function whoLabel(offer: AdminOffer): string {
  const conditions = offer.rule?.all ?? [];
  if (conditions.length === 0) return 'No conditions';
  return conditions.map(describeCondition).join(' · ');
}

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

/** Admin — offers list with stats (docs/product-spec.md section 10; access via ADMIN_USERS). */
export default async function AdminOffers() {
  const user = await requireUser();
  if (!isAdmin(getConfig(), user)) notFound();

  const offers = await listOffers(getDb());

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0C10] text-ink">
      <AdminHeader />
      <div className="flex flex-grow flex-col gap-5 px-8 py-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-head text-[22px] font-extrabold uppercase">Offers</h1>
            <label htmlFor="adm-week" className="text-[13px] text-ink-3">
              Week
            </label>
            <select
              id="adm-week"
              className="h-11 rounded-chip border-[1.5px] border-[#4A4E5A] bg-panel px-3 text-sm text-ink"
            >
              <option>Week 46 · live</option>
              <option>Week 47 · next drop</option>
            </select>
          </div>
          <Link
            href="/admin/offers/new"
            className="flex h-12 items-center rounded-[14px] bg-orange px-[22px] text-sm font-bold text-on-orange"
          >
            New offer
          </Link>
        </div>

        <table className="w-full border-collapse overflow-hidden rounded-button bg-panel">
          <thead>
            <tr>
              {COLUMNS.map((h, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-divider px-3.5 py-3 text-left text-xs font-semibold text-ink-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm font-semibold">
                  {o.merchantName}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm font-semibold">
                  {o.headline}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {typeLabel(o)}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {SIDE_LABEL[o.axis] ?? o.axis}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {whoLabel(o)}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  [N]
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  [N]
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  [N]
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.type === 'cashback' ? '[N]' : '—'}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      o.active ? 'bg-green text-on-orange' : 'bg-divider text-ink-2'
                    }`}
                  >
                    {o.active ? 'Live' : 'Off'}
                  </span>
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm">
                  <Link
                    href={`/admin/offers/${o.id}`}
                    className="inline-flex min-h-11 items-center text-sm font-semibold text-orange-light"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-[13px] text-ink-3">
          Eligible counts are for the selected week. Conditions built on health data are not allowed
          and cannot be saved.
        </div>
      </div>
    </div>
  );
}
