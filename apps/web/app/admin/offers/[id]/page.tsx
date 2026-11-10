/** Admin — edit offer with a condition builder (docs/product-spec.md section 10). */
export default async function AdminOfferEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const field = (label: string, value = '') => (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-widest text-ink-3">{label}</span>
      <input
        defaultValue={value}
        className="w-full rounded-button border border-divider bg-panel p-2.5 text-sm"
      />
    </label>
  );

  return (
    <main className="mx-auto max-w-[760px] px-8 py-8">
      <h1 className="mb-6 font-head text-2xl font-extrabold">
        {id === 'new' ? 'New offer' : `Edit offer ${id}`}
      </h1>
      <div className="grid grid-cols-2 gap-4">
        {field('Merchant', '[PARTNER A]')}
        {field('Headline', '8% back')}
        {field('Axis', 'gaming')}
        {field('Priority', '10')}
        {field('Type (cashback/promo)', 'cashback')}
        {field('Countries (CSV)', 'PL,DE,GB')}
      </div>

      <section className="mt-6 space-y-2 rounded-panel border border-divider bg-panel p-4">
        <div className="text-xs uppercase tracking-widest text-ink-3">
          Conditions (all must match)
        </div>
        <div className="flex gap-2">
          <select className="rounded-button border border-divider bg-black/20 p-2 text-sm">
            <option>axis_gte</option>
            <option>connected</option>
            <option>metric_gte</option>
            <option>level_gte</option>
            <option>country_in</option>
            <option>has_card</option>
          </select>
          <input
            placeholder="gaming"
            className="rounded-button border border-divider bg-black/20 p-2 text-sm"
          />
          <input
            placeholder="40"
            className="w-20 rounded-button border border-divider bg-black/20 p-2 text-sm"
          />
          <button className="rounded-button bg-white/10 px-3 text-sm">Add</button>
        </div>
        <p className="text-xs text-orange-light">Health-axis metrics are rejected on save.</p>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-ink-3">Would match ~4,200 users this week</span>
        <button className="rounded-button bg-blue px-5 py-2 text-sm font-semibold">
          Save offer
        </button>
      </div>
    </main>
  );
}
