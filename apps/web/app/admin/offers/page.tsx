import Link from 'next/link';

type Offer = {
  id: string;
  merchant: string;
  offer: string;
  type: string;
  side: string;
  who: string;
  eligible: string;
  shown: string;
  activated: string;
  used: string;
  status: string;
  statusClass: string;
};

const OFFERS: Offer[] = [
  {
    id: 'o1',
    merchant: '[PARTNER A]',
    offer: '[RATE]% back at skin marketplaces',
    type: 'Cashback',
    side: 'Gaming',
    who: 'Steam connected · CS2 hours 2w ≥ 5',
    eligible: '[N]',
    shown: '[N]',
    activated: '[N]',
    used: '[N]',
    status: 'Live',
    statusClass: 'bg-green',
  },
  {
    id: 'o2',
    merchant: '[PARTNER B]',
    offer: '[Early access] to tickets',
    type: 'Promo · pool',
    side: 'Music',
    who: 'Music ≥ 40 · new tracks 30d ≥ 10',
    eligible: '[N]',
    shown: '[N]',
    activated: '[N]',
    used: '—',
    status: 'Live',
    statusClass: 'bg-green',
  },
  {
    id: 'o3',
    merchant: '[PARTNER C]',
    offer: '[RATE]% back on every purchase',
    type: 'Cashback',
    side: 'Crypto',
    who: 'Wallet age ≥ 5 yrs · has card',
    eligible: '[N]',
    shown: '[N]',
    activated: '[N]',
    used: '[N]',
    status: 'Live',
    statusClass: 'bg-green',
  },
  {
    id: 'o4',
    merchant: '[PARTNER D]',
    offer: '[Discount] on gear',
    type: 'Promo · shared',
    side: 'Any',
    who: 'No conditions',
    eligible: '[N]',
    shown: '[N]',
    activated: '[N]',
    used: '—',
    status: 'Next week',
    statusClass: 'whitespace-nowrap bg-orange-light',
  },
  {
    id: 'o5',
    merchant: '[PARTNER E]',
    offer: '[Discount] on flights',
    type: 'Promo · pool',
    side: 'Lifestyle',
    who: 'Countries ≥ 5',
    eligible: '[N]',
    shown: '[N]',
    activated: '[N]',
    used: '—',
    status: 'Codes out',
    statusClass: 'whitespace-nowrap bg-[#FF8A7A]',
  },
];

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
        <div className="font-head text-base font-extrabold tracking-[0.04em]">PASTRA</div>
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
export default function AdminOffers() {
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
            {OFFERS.map((o) => (
              <tr key={o.id}>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm font-semibold">
                  {o.merchant}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm font-semibold">
                  {o.offer}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.type}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.side}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.who}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.eligible}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.shown}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.activated}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  {o.used}
                </td>
                <td className="border-b border-divider px-3.5 py-3.5 align-middle text-sm text-ink-2">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold text-on-orange ${o.statusClass}`}
                  >
                    {o.status}
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
