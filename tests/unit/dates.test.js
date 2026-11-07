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
