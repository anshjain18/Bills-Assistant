const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Paise (1/100 ₹) to display string */
export function formatInrFromPaise(paise: number): string {
  return formatter.format(paise / 100);
}

/** Parse user input like "123", "123.4", "1,234.56" to integer paise */
export function parseInrInputToPaise(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '');
  if (trimmed === '') return null;
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
