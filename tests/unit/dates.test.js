import { describe, expect, it } from 'vitest';
import { todayStr } from '../../src/lib/dates.js';

describe('todayStr', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(todayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayStr(new Date(2026, 10, 29))).toBe('2026-11-29');
  });
});
