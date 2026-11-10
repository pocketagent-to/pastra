import Link from 'next/link';

const OFFERS = [
  {
    id: 'o1',
    merchant: '[PARTNER A]',
    axis: 'Gaming',
    type: 'cashback',
    shown: 1240,
    activated: 318,
    used: 96,
  },
  {
    id: 'o2',
    merchant: '[PARTNER B]',
    axis: 'Crypto',
    type: 'cashback',
    shown: 980,
    activated: 210,
    used: 54,
  },
  {
    id: 'o3',
    merchant: '[PARTNER C]',
    axis: 'Music',
    type: 'promo',
    shown: 1500,
    activated: 640,
    used: 0,
  },
];

/** Admin — offers list with stats (docs/product-spec.md section 10; access via ADMIN_USERS). */
export default function AdminOffers() {
  return (
    <main className="mx-auto max-w-[1280px] px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-head text-2xl font-extrabold">Offers · week 2026-W46</h1>
        <Link
          href="/admin/offers/new"
          className="rounded-button bg-blue px-4 py-2 text-sm font-semibold"
        >
          New offer
        </Link>
      </div>
      <div className="overflow-hidden rounded-panel border border-divider">
        <table className="w-full text-sm">
          <thead className="bg-panel text-left text-ink-3">
            <tr>
              {['Merchant', 'Axis', 'Type', 'Shown', 'Activated', 'Used', ''].map((h) => (
                <th key={h} className="p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OFFERS.map((o) => (
              <tr key={o.id} className="border-t border-divider">
                <td className="p-3 font-semibold">{o.merchant}</td>
                <td className="p-3 text-ink-2">{o.axis}</td>
                <td className="p-3 text-ink-2">{o.type}</td>
                <td className="p-3 tabular-nums">{o.shown}</td>
                <td className="p-3 tabular-nums">{o.activated}</td>
                <td className="p-3 tabular-nums">{o.used}</td>
                <td className="p-3">
                  <Link href={`/admin/offers/${o.id}`} className="text-blue">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
