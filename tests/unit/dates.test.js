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
    expect(pregnancyProgress('2026-11-07', now)).toMatchObject({ day: 0, left: 283, percent: 0 });
    expect(pregnancyProgress('2026-08-15', now)).toMatchObject({ day: 84, left: 199, percent: 30 });
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

import { calendarDiff, durationText, pregnancyTexts } from '../../src/lib/dates.js';

describe('months and days', () => {
  const d = (y, m, day) => new Date(y, m - 1, day);
  it('calendarDiff counts whole calendar months and the days left over', () => {
    expect(calendarDiff(d(2026, 1, 10), d(2026, 7, 22))).toEqual({ months: 6, days: 12 });
    expect(calendarDiff(d(2026, 1, 10), d(2026, 1, 10))).toEqual({ months: 0, days: 0 });
    expect(calendarDiff(d(2026, 1, 31), d(2026, 2, 28))).toEqual({ months: 1, days: 0 });     // short months clamp
    expect(calendarDiff(d(2026, 11, 20), d(2027, 2, 5))).toEqual({ months: 2, days: 16 });
    expect(calendarDiff(d(2026, 3, 15), d(2026, 4, 14))).toEqual({ months: 0, days: 30 });
  });
  it('durationText says both, singular or plural, and drops a zero part', () => {
    expect(durationText({ months: 6, days: 12 })).toBe('6 months 12 days');
    expect(durationText({ months: 1, days: 1 })).toBe('1 month 1 day');
    expect(durationText({ months: 2, days: 0 })).toBe('2 months');
    expect(durationText({ months: 0, days: 9 })).toBe('9 days');
    expect(durationText({ months: 0, days: 0 })).toBe('0 days');
  });
  it('a pregnancy gets elapsed, remaining and overdue spans', () => {
    const now = new Date(2026, 6, 22, 10, 0);
    const p = pregnancyProgress('2026-01-10', now, 283);
    expect(p).toMatchObject({ day: 193, left: 90, elapsed: { months: 6, days: 12 } });
    expect(p.remaining).toEqual(calendarDiff(new Date(2026, 6, 22), new Date(2026, 9, 20)));   // 10 Jan + 283 days = 20 Oct
    expect(p.overdueBy).toBeNull();
    const late = pregnancyProgress('2025-12-01', new Date(2026, 10, 12), 283);                  // due 10 Sep 2026
    expect(late.overdueBy).toEqual({ months: 2, days: 2 });
    expect(late.remaining).toBeNull();
  });
  it('pregnancyTexts: "6 months 12 days", "3 months to calving", due today, overdue', () => {
    const now = new Date(2026, 6, 22, 10, 0);
    expect(pregnancyTexts(pregnancyProgress('2026-01-10', now, 283))).toEqual({
      elapsed: '6 months 12 days', toCalving: '2 months 28 days to calving', left: '2 months 28 days left', overdue: false
    });
    expect(pregnancyTexts(pregnancyProgress('2026-01-10', new Date(2026, 9, 20), 283)).toCalving).toBe('Due today');
    const late = pregnancyTexts(pregnancyProgress('2026-01-10', new Date(2026, 9, 27), 283));
    expect(late).toMatchObject({ toCalving: 'Overdue by 7 days', left: 'overdue by 7 days', overdue: true });
  });
  it('a buffalo is due later than a cow for the same AI date', () => {
    const now = new Date(2026, 9, 1);
    expect(pregnancyTexts(pregnancyProgress('2026-01-10', now, 283)).toCalving).not.toBe(pregnancyTexts(pregnancyProgress('2026-01-10', now, 310)).toCalving);
  });
});
