import { describe, expect, it } from 'vitest';
import { amountDue, formatLiters, monthlyTotals, percentPaid, sumAmounts } from '../../src/lib/calc.js';

const payments = [{ amount: 30000 }, { amount: '30000' }, { amount: 'bad' }];

describe('calc helpers', () => {
  it('sums amounts, ignoring bad numbers and missing lists', () => {
    expect(sumAmounts(payments)).toBe(60000);
    expect(sumAmounts(undefined)).toBe(0);
  });

  it('computes amount due and never goes negative', () => {
    expect(amountDue(120000, payments)).toBe(60000);
    expect(amountDue(50000, payments)).toBe(0);
  });

  it('computes percent paid, capped at 100, empty bill counts as paid', () => {
    expect(percentPaid(120000, payments)).toBe(50);
    expect(percentPaid(10000, payments)).toBe(100);
    expect(percentPaid(0, [])).toBe(100);
  });

  it('formats liters with at most one decimal', () => {
    expect(formatLiters(12)).toBe('12');
    expect(formatLiters(12.5)).toBe('12.5');
    expect(formatLiters(0)).toBe('0');
  });
});

describe('monthlyTotals', () => {
  const now = new Date(2026, 9, 29); // Oct 2026
  const tx = [
    { type: 'income', date: '2026-10-05', amount: 1000 },
    { type: 'expense', date: '2026-10-20', amount: 300 },
    { type: 'expense', date: '2026-05-01', amount: 50 }, // exactly 5 months back: kept
    { type: 'income', date: '2026-04-30', amount: 999 }, // 6 months back: outside the window
    { type: 'income', date: 'bad', amount: 5 }
  ];

  it('returns the last 6 months oldest-first, ending with the current month', () => {
    const r = monthlyTotals(tx, now, 6);
    expect(r.map((m) => m.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('sums income and expenses per month and ignores out-of-range or invalid dates', () => {
    const r = monthlyTotals(tx, now, 6);
    expect(r[5]).toMatchObject({ income: 1000, expense: 300 });
    expect(r[0]).toMatchObject({ income: 0, expense: 50 });
    expect(r.reduce((s, m) => s + m.income, 0)).toBe(1000);
  });

  it('crosses year boundaries', () => {
    expect(monthlyTotals([], new Date(2026, 1, 10), 4).map((m) => m.key)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});
