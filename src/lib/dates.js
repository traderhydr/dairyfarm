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

const addMonthsClamped = (date, months) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
};

/** Whole calendar months and the days left over between two dates (from <= to). */
export function calendarDiff(from, to) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (addMonthsClamped(from, months) > to) months -= 1;
  const days = Math.round((to - addMonthsClamped(from, months)) / 86400000);
  return { months: Math.max(0, months), days };
}

/** "3 months 12 days", "2 months", "12 days": both, the way farmers say it. */
export function durationText({ months, days }) {
  const parts = [];
  if (months) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days || !months) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  return parts.join(' ');
}

/**
 * How far along a pregnancy is, counted from the AI date.
 * `day` is the number of days since AI (0 on the AI day); null if the date is missing/invalid or in the future.
 * `left` is days until the expected calving date (negative once overdue).
 * `elapsed`, `remaining` (while she is not yet due) and `overdueBy` are the same spans as months and days.
 */
export function pregnancyProgress(aiDate, now = new Date(), gestation = GESTATION_DAYS) {
  const start = parseLocalDate(aiDate);
  if (!start) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = Math.round((today - start) / 86400000);
  if (day < 0) return null;
  const due = new Date(start.getFullYear(), start.getMonth(), start.getDate() + gestation);
  const left = gestation - day;
  return {
    day,
    left,
    percent: Math.max(0, Math.min(100, Math.round((day / gestation) * 100))),
    elapsed: calendarDiff(start, today),
    remaining: left > 0 ? calendarDiff(today, due) : null,
    overdueBy: left < 0 ? calendarDiff(due, today) : null
  };
}

/** The words for a progress: how long she has been pregnant, and how long to go (months and days). */
export function pregnancyTexts(progress) {
  const elapsed = durationText(progress.elapsed);
  let toCalving;
  let left;
  if (progress.left > 0) { toCalving = `${durationText(progress.remaining)} to calving`; left = `${durationText(progress.remaining)} left`; }
  else if (progress.left === 0) { toCalving = 'Due today'; left = 'due today'; }
  else { toCalving = `Overdue by ${durationText(progress.overdueBy)}`; left = `overdue by ${durationText(progress.overdueBy)}`; }
  return { elapsed, toCalving, left, overdue: progress.left < 0 };
}
