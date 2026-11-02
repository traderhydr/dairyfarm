// Pure maths for savings goals: progress, time left and a suggested monthly amount.
import { sumAmounts } from './calc.js';
import { parseLocalDate } from './dates.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function goalProgress(goal) {
  const target = Math.max(0, Number(goal.target) || 0);
  const saved = sumAmounts(goal.contributions);
  const remaining = Math.max(0, target - saved);
  const reached = target > 0 && saved >= target;
  // floor, so 99.6% never shows as a finished 100%
  const percent = target > 0 ? Math.min(100, Math.floor((saved / target) * 100)) : 0;
  return { saved, target, remaining, percent, reached };
}

/** Whole days from today to the goal's target date (negative if it has passed); null with no date. */
export function daysLeft(goal, now = new Date()) {
  const date = parseLocalDate(goal.targetDate);
  if (!date) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date - today) / DAY_MS);
}

/** How much to put aside each month to hit the target date; null when it doesn't apply. */
export function suggestedMonthly(goal, now = new Date()) {
  const { remaining, reached } = goalProgress(goal);
  const days = daysLeft(goal, now);
  if (reached || days === null || days <= 0) return null;
  const months = Math.max(1, Math.ceil(days / 30));
  return Math.ceil(remaining / months);
}

/** True when `after` is the first time the saved total reaches the target. */
export function justReached(before, after, target) {
  return target > 0 && before < target && after >= target;
}
