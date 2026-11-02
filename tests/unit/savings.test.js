import { describe, expect, it } from 'vitest';
import { daysLeft, goalProgress, justReached, suggestedMonthly } from '../../src/lib/savings.js';

const now = new Date(2026, 10, 2, 15, 30); // 2 Nov 2026
const goal = (over = {}) => ({ target: 100000, targetDate: '', contributions: [{ amount: 25000 }, { amount: '15000' }, { amount: 'bad' }], ...over });

describe('goalProgress', () => {
  it('adds up contributions and ignores bad numbers', () => {
    expect(goalProgress(goal())).toEqual({ saved: 40000, target: 100000, remaining: 60000, percent: 40, reached: false });
  });

  it('never shows 100% until the goal is actually reached', () => {
    expect(goalProgress(goal({ contributions: [{ amount: 99999 }] })).percent).toBe(99);
    expect(goalProgress(goal({ contributions: [{ amount: 100000 }] }))).toMatchObject({ percent: 100, reached: true, remaining: 0 });
  });

  it('caps at 100% when over-saved and survives empty or missing data', () => {
    expect(goalProgress(goal({ contributions: [{ amount: 250000 }] }))).toMatchObject({ percent: 100, remaining: 0, reached: true });
    expect(goalProgress({ target: 5000 })).toMatchObject({ saved: 0, percent: 0, reached: false });
    expect(goalProgress({ target: 0, contributions: [] })).toMatchObject({ percent: 0, reached: false });
  });
});

describe('daysLeft', () => {
  it('counts whole days regardless of the time of day', () => {
    expect(daysLeft({ targetDate: '2026-11-12' }, now)).toBe(10);
    expect(daysLeft({ targetDate: '2026-11-02' }, now)).toBe(0);
    expect(daysLeft({ targetDate: '2026-10-30' }, now)).toBe(-3);
  });

  it('returns null without a valid date', () => {
    expect(daysLeft({ targetDate: '' }, now)).toBeNull();
    expect(daysLeft({}, now)).toBeNull();
    expect(daysLeft({ targetDate: 'nope' }, now)).toBeNull();
  });
});

describe('suggestedMonthly', () => {
  it('spreads what is left over the months remaining, rounding up', () => {
    // 60,000 left, 90 days = 3 months
    expect(suggestedMonthly(goal({ targetDate: '2027-01-31' }), now)).toBe(20000);
    // 60,000 left, 100 days = ceil(3.33) = 4 months
    expect(suggestedMonthly(goal({ targetDate: '2027-02-10' }), now)).toBe(15000);
  });

  it('suggests the whole remainder when under a month is left', () => {
    expect(suggestedMonthly(goal({ targetDate: '2026-11-20' }), now)).toBe(60000);
  });

  it('is null when there is no date, the date has passed, or the goal is done', () => {
    expect(suggestedMonthly(goal(), now)).toBeNull();
    expect(suggestedMonthly(goal({ targetDate: '2026-10-01' }), now)).toBeNull();
    expect(suggestedMonthly(goal({ targetDate: '2027-01-01', contributions: [{ amount: 100000 }] }), now)).toBeNull();
  });
});

describe('justReached', () => {
  it('fires only on the contribution that crosses the target', () => {
    expect(justReached(90000, 100000, 100000)).toBe(true);
    expect(justReached(90000, 95000, 100000)).toBe(false);
    expect(justReached(100000, 120000, 100000)).toBe(false);
    expect(justReached(0, 10, 0)).toBe(false);
  });
});
