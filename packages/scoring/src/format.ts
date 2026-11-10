/**
 * Format a count for "Your numbers" and share cards (docs/product-spec.md section 6.8):
 * up to 9,999 with a thousands comma ("2,140"), 10,000+ with a suffix ("12.4K", "1.2M").
 * Grouping is done manually so the output does not depend on the runtime locale.
 */
export function formatCount(value: number): string {
  const abs = Math.abs(value);
  if (abs < 10_000) {
    return groupThousands(Math.round(value));
  }
  if (abs < 1_000_000) {
    return trimDecimal(value / 1000) + 'K';
  }
  return trimDecimal(value / 1_000_000) + 'M';
}

function groupThousands(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function trimDecimal(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Fill `{name}` placeholders from a variables map; unknown placeholders are left in place. */
export function fillTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
