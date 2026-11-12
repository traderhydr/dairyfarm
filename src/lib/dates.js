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

export const GESTATION_DAYS = 283;

/**
 * How far along a pregnancy is, counted from the AI date.
 * `day` is the number of days since AI (0 on the AI day); null if the date is missing/invalid or in the future.
 * `left` is days until the expected calving date (negative once overdue).
 */
export function pregnancyProgress(aiDate, now = new Date(), gestation = GESTATION_DAYS) {
  const start = parseLocalDate(aiDate);
  if (!start) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = Math.round((today - start) / 86400000);
  if (day < 0) return null;
  return {
    day,
    left: gestation - day,
    percent: Math.max(0, Math.min(100, Math.round((day / gestation) * 100)))
  };
}

export const DAYS_PER_MONTH = 30.4375;

/**
 * The same pregnancy progress in months, the way farmers count it ("month 4 of 9", "6 months to calving").
 * `progress` is the result of pregnancyProgress(); `gestation` is the species' days (283 cow, 310 buffalo).
 */
export function pregnancyMonths(progress, gestation = GESTATION_DAYS) {
  const total = Math.round(gestation / DAYS_PER_MONTH);
  const month = Math.min(total, Math.floor(progress.day / DAYS_PER_MONTH) + 1);
  const n = (days) => Math.max(1, Math.round(days / DAYS_PER_MONTH));
  const plural = (count) => `${count} ${count === 1 ? 'month' : 'months'}`;
  let toCalving;
  let left;
  if (progress.left > 30) { toCalving = `${plural(n(progress.left))} to calving`; left = `${plural(n(progress.left))} left`; }
  else if (progress.left > 0) { toCalving = 'Due this month'; left = 'due this month'; }
  else if (progress.left === 0) { toCalving = 'Due today'; left = 'due today'; }
  else if (-progress.left > 30) { toCalving = `${plural(n(-progress.left))} overdue`; left = `${plural(n(-progress.left))} overdue`; }
  else { toCalving = 'Overdue'; left = 'overdue'; }
  return { month, total, toCalving, left, overdue: progress.left < 0 };
}
