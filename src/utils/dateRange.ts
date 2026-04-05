/** Inclusive date range using ISO strings (bill `created_at` comparison). */
export type DateRange = { startIso: string; endIso: string };

export function startOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDayLocal(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Last N calendar days including today (local). */
export function lastNDaysInclusive(days: number): DateRange {
  const end = endOfDayLocal(new Date());
  const start = startOfDayLocal(new Date());
  start.setDate(start.getDate() - (days - 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function formatRangeShort(range: DateRange | null): string {
  if (!range) return 'All time';
  const s = new Date(range.startIso);
  const e = new Date(range.endIso);
  const opts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  };
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}
