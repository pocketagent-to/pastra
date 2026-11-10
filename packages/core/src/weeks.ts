/**
 * ISO week helpers. All week math is in UTC (docs/architecture.md section 9). A week string is
 * `YYYY-Www`, e.g. `2026-W46`.
 */
export function isoWeekParts(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // move to the Thursday of this week
  const year = d.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return { year, week };
}

export function isoWeekString(date: Date): string {
  const { year, week } = isoWeekParts(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Add (or subtract) whole weeks to a week string, returning the new week string. */
export function addWeeks(week: string, delta: number): string {
  const monday = mondayOf(week);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return isoWeekString(monday);
}

/** The Monday 00:00 UTC of a week string. */
export function mondayOf(week: string): Date {
  const match = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!match) throw new Error(`Invalid week string: ${week}`);
  const year = Number(match[1]);
  const weekNum = Number(match[2]);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (weekNum - 1) * 7);
  return monday;
}
