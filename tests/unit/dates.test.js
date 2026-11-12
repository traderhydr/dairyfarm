import { describe, expect, it } from 'vitest';
import { pregnancyProgress, todayStr } from '../../src/lib/dates.js';

describe('todayStr', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayStr(new Date(2026, 10, 29))).toBe('2026-11-29');
  });
});

describe('pregnancyProgress', () => {
  const now = new Date(2026, 10, 7, 15, 30);
  it('counts whole days since AI and days left of the 283-day gestation', () => {
    expect(pregnancyProgress('2026-11-07', now)).toEqual({ day: 0, left: 283, percent: 0 });
    expect(pregnancyProgress('2026-08-15', now)).toEqual({ day: 84, left: 199, percent: 30 });
  });
  it('goes negative on days left once overdue and caps the percent at 100', () => {
    const p = pregnancyProgress('2025-11-07', now);
    expect(p.day).toBe(365);
    expect(p.left).toBe(-82);
    expect(p.percent).toBe(100);
  });
  it('is not affected by clock changes around daylight saving', () => {
    expect(pregnancyProgress('2026-03-01', new Date(2026, 3, 1, 0, 5)).day).toBe(31);
  });
  it('returns null for a missing, invalid or future AI date', () => {
    expect(pregnancyProgress('', now)).toBeNull();
    expect(pregnancyProgress('abc', now)).toBeNull();
    expect(pregnancyProgress('2026-11-08', now)).toBeNull();
  });
});

import { pregnancyMonths } from '../../src/lib/dates.js';

describe('pregnancyMonths', () => {
  const months = (aiDate, gestation, now) => pregnancyMonths(pregnancyProgress(aiDate, now, gestation), gestation);
  const now = new Date(2026, 10, 12, 10, 0);
  it('counts the month she is in and the months to go (cow 9 months, buffalo 10)', () => {
    expect(months('2026-11-12', 283, now)).toMatchObject({ month: 1, total: 9, toCalving: '9 months to calving' });
    expect(months('2026-08-04', 283, now)).toMatchObject({ month: 4, total: 9, toCalving: '6 months to calving' });   // day 100
    expect(months('2026-08-04', 310, now)).toMatchObject({ month: 4, total: 10, toCalving: '7 months to calving' });
  });
  it('says "Due this month", "Due today", "Overdue" near and after the date', () => {
    expect(months('2026-02-08', 283, now).toCalving).toBe('Due this month');     // 11 days left
    expect(months('2026-02-01', 283, now).toCalving).toBe('Overdue');            // 7 days past
    expect(months('2025-12-01', 283, now)).toMatchObject({ toCalving: '2 months overdue', overdue: true });
    expect(pregnancyMonths({ day: 283, left: 0, percent: 100 }, 283).toCalving).toBe('Due today');
  });
  it('never shows a month beyond the last one and says "1 month" in the singular', () => {
    expect(months('2025-01-01', 283, now).month).toBe(9);
    expect(pregnancyMonths({ day: 250, left: 33, percent: 88 }, 283).toCalving).toBe('1 month to calving');
  });
  it('has a short form for the AI form preview', () => {
    expect(months('2026-08-04', 283, now).left).toBe('6 months left');
  });
});
