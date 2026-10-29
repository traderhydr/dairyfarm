/** Today's date in the device's local timezone as YYYY-MM-DD (for <input type="date">). */
export function todayStr(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string as local midnight; null if it isn't a real date. */
export function parseLocalDate(str) {
  const parts = String(str || '').split('-');
  if (parts.length !== 3) return null;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Local-midnight Date `days` after a YYYY-MM-DD string; null if the input is invalid. */
export function addDaysDate(str, days) {
  const d = parseLocalDate(str);
  if (!d) return null;
  d.setDate(d.getDate() + days);
  return d;
}
