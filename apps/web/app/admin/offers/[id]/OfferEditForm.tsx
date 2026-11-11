'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Condition } from '@pastra/catalog';
import type { AdminOffer, OfferCodeMode } from '@pastra/core';

const labelCls = 'text-[13px] font-semibold text-ink-2';
const controlCls =
  'h-12 w-full rounded-chip border-[1.5px] border-[#4A4E5A] bg-[#0B0C10] px-3.5 text-sm text-ink';

const SIDE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'gaming', label: 'Gaming' },
  { code: 'sports', label: 'Sports' },
  { code: 'crypto', label: 'Crypto' },
  { code: 'music', label: 'Music & Entertainment' },
  { code: 'social', label: 'Social' },
  { code: 'lifestyle', label: 'Lifestyle' },
  { code: 'any', label: 'Any' },
];

type UiType = 'Cashback' | 'Promo code · shared' | 'Promo code · pool';

const TYPE_OPTIONS: UiType[] = ['Cashback', 'Promo code · shared', 'Promo code · pool'];

function uiTypeOf(offer: AdminOffer | null): UiType {
  if (!offer || offer.type === 'cashback') return 'Cashback';
  return offer.codeMode === 'pool' ? 'Promo code · pool' : 'Promo code · shared';
}

function splitUiType(ui: UiType): { type: 'cashback' | 'promo'; codeMode: OfferCodeMode | null } {
  if (ui === 'Cashback') return { type: 'cashback', codeMode: null };
  if (ui === 'Promo code · pool') return { type: 'promo', codeMode: 'pool' };
  return { type: 'promo', codeMode: 'shared' };
}

type CondKind = 'connected' | 'metric_gte' | 'axis_gte' | 'level_gte' | 'has_card';

const KIND_LABEL: Record<CondKind, string> = {
  connected: 'Service connected',
  metric_gte: 'Metric at least',
  axis_gte: 'Side at least',
  level_gte: 'Level at least',
  has_card: 'Has card',
};

interface CondRow {
  id: number;
  kind: CondKind;
  target: string;
  value: string;
}

interface Options {
  providers: Array<{ id: string; name: string }>;
  metrics: Array<{ key: string; label: string }>;
  axes: Array<{ code: string; label: string }>;
}

/** Parse an offer rule into editable rows; conditions this UI cannot represent are kept aside. */
function splitRule(
  rule: { all: Condition[] } | null | undefined,
  opts: Options,
): { rows: CondRow[]; extra: Condition[] } {
  const rows: CondRow[] = [];
  const extra: Condition[] = [];
  let id = 0;
  for (const c of rule?.all ?? []) {
    if (c.kind === 'connected') rows.push({ id: id++, kind: 'connected', target: c.provider, value: 'yes' });
    else if (c.kind === 'metric_gte')
      rows.push({ id: id++, kind: 'metric_gte', target: c.metric, value: String(c.value) });
    else if (c.kind === 'axis_gte')
      rows.push({ id: id++, kind: 'axis_gte', target: c.axis, value: String(c.value) });
    else if (c.kind === 'level_gte') rows.push({ id: id++, kind: 'level_gte', target: '', value: String(c.value) });
    else if (c.kind === 'has_card') rows.push({ id: id++, kind: 'has_card', target: '', value: 'yes' });
    else extra.push(c);
  }
  void opts;
  return { rows, extra };
}

function defaultTarget(kind: CondKind, opts: Options): string {
  if (kind === 'connected') return opts.providers[0]?.id ?? '';
  if (kind === 'metric_gte') return opts.metrics[0]?.key ?? '';
  if (kind === 'axis_gte') return opts.axes[0]?.code ?? '';
  return '';
}

function toCondition(row: CondRow): Condition | null {
  switch (row.kind) {
    case 'connected':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return row.target ? { kind: 'connected', provider: row.target as any } : null;
    case 'metric_gte':
      return row.target ? { kind: 'metric_gte', metric: row.target, value: Number(row.value) || 0 } : null;
    case 'axis_gte':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return row.target ? { kind: 'axis_gte', axis: row.target as any, value: Number(row.value) || 0 } : null;
    case 'level_gte':
      return { kind: 'level_gte', value: Number(row.value) || 0 };
    case 'has_card':
      return { kind: 'has_card' };
    default:
      return null;
  }
}

/** Admin — create/edit an offer; posts to /api/admin/offers (docs/product-spec.md section 10). */
export function OfferEditForm({
  isNew,
  offerId,
  offer,
  merchantNames,
  options,
}: {
  isNew: boolean;
  offerId: string | null;
  offer: AdminOffer | null;
  merchantNames: string[];
  options: Options;
}) {
  const router = useRouter();

  const merchantOptions = [...(merchantNames.length > 0 ? merchantNames : ['[PARTNER A]'])];
  if (offer?.merchantName && !merchantOptions.includes(offer.merchantName)) {
    merchantOptions.unshift(offer.merchantName);
  }

  const initial = splitRule(offer?.rule, options);

  const [merchant, setMerchant] = useState(offer?.merchantName ?? merchantOptions[0] ?? '');
  const [uiType, setUiType] = useState<UiType>(uiTypeOf(offer));
  const [headline, setHeadline] = useState(offer?.headline ?? '[RATE]% back at skin marketplaces');
  const [side, setSide] = useState(offer?.axis ?? 'gaming');
  const [rate, setRate] = useState(offer?.rate ?? '[RATE]');
  const [priority, setPriority] = useState(String(offer?.priority ?? 80));
  const [countries, setCountries] = useState(
    offer?.countries && offer.countries.length > 0 ? offer.countries.join(', ') : 'All supported',
  );
  const [startsWeek, setStartsWeek] = useState(offer?.startsWeek ?? 'Week 46');
  const [endsWeek, setEndsWeek] = useState(offer?.endsWeek ?? 'Week 49');
  const [terms, setTerms] = useState(offer?.terms ?? '[OFFER TERMS]');
  const [rows, setRows] = useState<CondRow[]>(initial.rows);
  const [extra] = useState<Condition[]>(initial.extra);
  const [nextId, setNextId] = useState(initial.rows.length);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startsWeekOptions = Array.from(new Set(['Week 46', startsWeek]));
  const endsWeekOptions = Array.from(new Set(['Week 49', endsWeek]));

  function setRow(id: number, patch: Partial<CondRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function changeKind(id: number, kind: CondKind) {
    setRow(id, { kind, target: defaultTarget(kind, options), value: kind === 'has_card' ? 'yes' : '' });
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { id: nextId, kind: 'connected', target: defaultTarget('connected', options), value: 'yes' },
    ]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function submit(active: boolean) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const { type, codeMode } = splitUiType(uiType);
    const trimmedCountries = countries.trim();
    const countryList =
      trimmedCountries === '' || trimmedCountries.toLowerCase() === 'all supported'
        ? null
        : trimmedCountries
            .split(',')
            .map((c) => c.trim())
            .filter((c) => c.length > 0);

    const rule = {
      all: [...rows.map(toCondition).filter((c): c is Condition => c !== null), ...extra],
    };

    const body = {
      merchantName: merchant,
      type,
      codeMode,
      axis: side,
      headline,
      rate,
      priority: Number(priority) || 0,
      countries: countryList,
      startsWeek,
      endsWeek,
      terms,
      rule,
      active,
    };

    const url = isNew ? '/api/admin/offers' : `/api/admin/offers/${offerId}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push('/admin/offers');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      setError(
        data.error?.code === 'forbidden'
          ? 'You are not allowed to edit offers.'
          : 'Could not save the offer. Check the fields and try again.',
      );
      setSubmitting(false);
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  const condTargetOptions = (kind: CondKind) => {
    if (kind === 'connected') return options.providers.map((p) => ({ value: p.id, label: p.name }));
    if (kind === 'metric_gte') return options.metrics.map((m) => ({ value: m.key, label: m.label }));
    if (kind === 'axis_gte') return options.axes.map((a) => ({ value: a.code, label: a.label }));
    return [];
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit(true);
      }}
      className="grid flex-grow grid-cols-[minmax(0,1fr)_380px] gap-7 px-8 py-7"
    >
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
            <select
              id="ao-m"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className={controlCls}
            >
              {merchantOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ao-t" className={labelCls}>
              Type
            </label>
            <select
              id="ao-t"
              value={uiType}
              onChange={(e) => setUiType(e.target.value as UiType)}
              className={controlCls}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <label htmlFor="ao-h" className={labelCls}>
              Headline shown to the user
            </label>
            <input
              id="ao-h"
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className={controlCls}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ao-a" className={labelCls}>
              Side
            </label>
            <select id="ao-a" value={side} onChange={(e) => setSide(e.target.value)} className={controlCls}>
              {SIDE_OPTIONS.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ao-r" className={labelCls}>
              Cashback rate, %
            </label>
            <input
              id="ao-r"
              type="text"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className={controlCls}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ao-p" className={labelCls}>
              Priority
            </label>
            <input
              id="ao-p"
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={controlCls}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ao-c" className={labelCls}>
              Countries
            </label>
            <input
              id="ao-c"
              type="text"
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              className={controlCls}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ao-w1" className={labelCls}>
              First week
            </label>
            <select
              id="ao-w1"
              value={startsWeek}
              onChange={(e) => setStartsWeek(e.target.value)}
              className={controlCls}
            >
              {startsWeekOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ao-w2" className={labelCls}>
              Last week
            </label>
            <select
              id="ao-w2"
              value={endsWeek}
              onChange={(e) => setEndsWeek(e.target.value)}
              className={controlCls}
            >
              {endsWeekOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-2">
            <label htmlFor="ao-terms" className={labelCls}>
              Terms
            </label>
            <input
              id="ao-terms"
              type="text"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className={controlCls}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-button bg-panel p-5">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
            Who gets it · all conditions must match
          </div>
          {rows.map((row) => {
            const targets = condTargetOptions(row.kind);
            const hasTarget = row.kind === 'connected' || row.kind === 'metric_gte' || row.kind === 'axis_gte';
            const fixedValue = row.kind === 'connected' || row.kind === 'has_card';
            return (
              <div key={row.id} className="grid grid-cols-[1.2fr_1.4fr_0.8fr_44px] items-center gap-2">
                <select
                  aria-label="Condition"
                  value={row.kind}
                  onChange={(e) => changeKind(row.id, e.target.value as CondKind)}
                  className={controlCls}
                >
                  {(Object.keys(KIND_LABEL) as CondKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Target"
                  value={hasTarget ? row.target : ''}
                  onChange={(e) => setRow(row.id, { target: e.target.value })}
                  disabled={!hasTarget}
                  className={controlCls}
                >
                  {hasTarget ? (
                    targets.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))
                  ) : (
                    <option value="">—</option>
                  )}
                </select>
                <input
                  aria-label="Value"
                  type="text"
                  value={row.value}
                  onChange={(e) => setRow(row.id, { value: e.target.value })}
                  disabled={fixedValue}
                  className={controlCls}
                />
                <button
                  type="button"
                  aria-label="Remove condition"
                  onClick={() => removeRow(row.id)}
                  className="h-11 w-11 rounded-chip border-[1.5px] border-[#4A4E5A] bg-transparent text-lg text-ink-2"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addRow}
            className="min-h-11 self-start rounded-chip border-[1.5px] border-ink bg-transparent px-4 text-sm font-semibold text-ink"
          >
            Add condition
          </button>
          <div className="text-[13px] text-ink-3">
            Reason shown to the user is built from the first metric condition: “For 14 hours in CS2
            this week”.
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
            <div className="text-[13px] text-ink-2">For 14 hours in CS2 this week · [PARTNER A]</div>
            <div
              className="flex h-12 items-center justify-center rounded-[14px] font-head text-xs font-bold uppercase tracking-[0.03em] text-on-orange"
              style={{ background: 'var(--grad-button)' }}
            >
              Activate
            </div>
          </div>
        </div>

        {error && <p className="text-[13px] font-semibold text-[#FF8A7A]">{error}</p>}

        <div className="mt-auto flex flex-col gap-2.5">
          <button
            type="submit"
            disabled={submitting}
            className="h-[52px] rounded-[14px] bg-orange text-[15px] font-bold text-on-orange"
          >
            {submitting ? 'Saving…' : 'Save offer'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit(false)}
            className="h-12 rounded-[14px] border-[1.5px] border-[#FF8A7A] bg-transparent text-sm font-semibold text-[#FF8A7A]"
          >
            Turn off
          </button>
        </div>
      </div>
    </form>
  );
}
