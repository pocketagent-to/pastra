import Link from 'next/link';

const labelCls = 'text-[13px] font-semibold text-ink-2';
const controlCls =
  'h-12 w-full rounded-chip border-[1.5px] border-[#4A4E5A] bg-[#0B0C10] px-3.5 text-sm text-ink';

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

/** Admin — edit offer with a condition builder (docs/product-spec.md section 10). */
export default async function AdminOfferEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0C10] text-ink">
      <AdminHeader />
      <div className="grid flex-grow grid-cols-[minmax(0,1fr)_380px] gap-7 px-8 py-7">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <Link href="/admin/offers" className="flex min-h-11 items-center text-sm text-ink-2">
              All offers
            </Link>
            <div className="font-head text-[22px] font-extrabold uppercase">
              {isNew ? 'New offer' : 'Edit offer'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-button bg-panel p-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-m" className={labelCls}>
                Merchant
              </label>
              <select id="ao-m" className={controlCls}>
                <option>[PARTNER A]</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-t" className={labelCls}>
                Type
              </label>
              <select id="ao-t" className={controlCls}>
                <option>Cashback</option>
                <option>Promo code · shared</option>
                <option>Promo code · pool</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <label htmlFor="ao-h" className={labelCls}>
                Headline shown to the user
              </label>
              <input
                id="ao-h"
                type="text"
                defaultValue="[RATE]% back at skin marketplaces"
                className={controlCls}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-a" className={labelCls}>
                Side
              </label>
              <select id="ao-a" className={controlCls}>
                <option>Gaming</option>
                <option>Sports</option>
                <option>Crypto</option>
                <option>Music &amp; Entertainment</option>
                <option>Social</option>
                <option>Lifestyle</option>
                <option>Any</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-r" className={labelCls}>
                Cashback rate, %
              </label>
              <input id="ao-r" type="text" defaultValue="[RATE]" className={controlCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-p" className={labelCls}>
                Priority
              </label>
              <input id="ao-p" type="number" defaultValue={80} className={controlCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-c" className={labelCls}>
                Countries
              </label>
              <input id="ao-c" type="text" defaultValue="All supported" className={controlCls} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-w1" className={labelCls}>
                First week
              </label>
              <select id="ao-w1" className={controlCls}>
                <option>Week 46</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ao-w2" className={labelCls}>
                Last week
              </label>
              <select id="ao-w2" className={controlCls}>
                <option>Week 49</option>
              </select>
            </div>
            <div className="col-span-2 flex flex-col gap-2">
              <label htmlFor="ao-terms" className={labelCls}>
                Terms
              </label>
              <input
                id="ao-terms"
                type="text"
                defaultValue="[OFFER TERMS]"
                className={controlCls}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-button bg-panel p-5">
            <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
              Who gets it · all conditions must match
            </div>
            <div className="grid grid-cols-[1.2fr_1.4fr_0.8fr_44px] items-center gap-2">
              <select className={controlCls}>
                <option>Service connected</option>
              </select>
              <select className={controlCls}>
                <option>Steam</option>
              </select>
              <input aria-label="Value" type="text" defaultValue="yes" className={controlCls} />
              <button
                type="button"
                aria-label="Remove condition"
                className="h-11 w-11 rounded-chip border-[1.5px] border-[#4A4E5A] bg-transparent text-lg text-ink-2"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-[1.2fr_1.4fr_0.8fr_44px] items-center gap-2">
              <select className={controlCls}>
                <option>Metric at least</option>
              </select>
              <select className={controlCls}>
                <option>Steam · hours in CS2, 2 weeks</option>
              </select>
              <input aria-label="Value" type="text" defaultValue="5" className={controlCls} />
              <button
                type="button"
                aria-label="Remove condition"
                className="h-11 w-11 rounded-chip border-[1.5px] border-[#4A4E5A] bg-transparent text-lg text-ink-2"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-[1.2fr_1.4fr_0.8fr_44px] items-center gap-2">
              <select className={controlCls}>
                <option>Side at least</option>
              </select>
              <select className={controlCls}>
                <option>Gaming</option>
              </select>
              <input aria-label="Value" type="text" defaultValue="40" className={controlCls} />
              <button
                type="button"
                aria-label="Remove condition"
                className="h-11 w-11 rounded-chip border-[1.5px] border-[#4A4E5A] bg-transparent text-lg text-ink-2"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              className="min-h-11 self-start rounded-chip border-[1.5px] border-ink bg-transparent px-4 text-sm font-semibold text-ink"
            >
              Add condition
            </button>
            <div className="text-[13px] text-ink-3">
              Reason shown to the user is built from the first metric condition: “For 14 hours in
              CS2 this week”.
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-button bg-panel p-5">
            <div className="text-[13px] text-ink-3">Eligible users in week 46</div>
            <div className="font-head text-[34px] font-extrabold text-orange">[N]</div>
            <div className="text-[13px] text-ink-2">of [N] with offers turned on</div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[13px] text-ink-3">Preview</div>
            <div className="flex flex-col gap-2.5 rounded-card bg-panel p-4">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="rounded-lg px-2.5 py-[5px] font-head text-[10px] font-bold tracking-[0.06em]"
                  style={{ background: 'linear-gradient(90deg,#3D6BFF,#6A3DFF)' }}
                >
                  GAMING
                </span>
                <span className="text-xs font-semibold text-ink-2">expires in 2 days</span>
              </div>
              <div className="font-head text-[15px] font-bold uppercase leading-[1.3]">
                [RATE]% back at skin marketplaces
              </div>
              <div className="text-[13px] text-ink-2">
                For 14 hours in CS2 this week · [PARTNER A]
              </div>
              <div
                className="flex h-12 items-center justify-center rounded-[14px] font-head text-xs font-bold uppercase tracking-[0.03em] text-on-orange"
                style={{ background: 'var(--grad-button)' }}
              >
                Activate
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2.5">
            <button
              type="button"
              className="h-[52px] rounded-[14px] bg-orange text-[15px] font-bold text-on-orange"
            >
              Save offer
            </button>
            <button
              type="button"
              className="h-12 rounded-[14px] border-[1.5px] border-[#FF8A7A] bg-transparent text-sm font-semibold text-[#FF8A7A]"
            >
              Turn off
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
