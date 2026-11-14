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

import { dailyTotals, periodRange, rangeTotals } from '../../src/lib/calc.js';

describe('profit and loss periods', () => {
  const now = new Date(2026, 10, 9, 14, 0);
  const tx = [
    { type: 'income', date: '2026-11-09', amount: 1000 },
    { type: 'expense', date: '2026-11-09', amount: 400 },
    { type: 'income', date: '2026-11-05', amount: 500 },
    { type: 'expense', date: '2026-11-01', amount: 900 },
    { type: 'income', date: '2026-10-31', amount: 7000 },
    { type: 'expense', date: '2026-02-03', amount: 100 }
  ];
  it('computes the ranges', () => {
    expect(periodRange('today', now)).toEqual({ from: '2026-11-09', to: '2026-11-09' });
    expect(periodRange('week', now)).toEqual({ from: '2026-11-03', to: '2026-11-09' });
    expect(periodRange('month', now)).toEqual({ from: '2026-11-01', to: '2026-11-09' });
    expect(periodRange('year', now)).toEqual({ from: '2026-01-01', to: '2026-11-09' });
  });
  it('week range crosses a month boundary correctly', () => {
    expect(periodRange('week', new Date(2026, 2, 3))).toEqual({ from: '2026-02-25', to: '2026-03-03' });
  });
  it('totals profit or loss for a period', () => {
    const today = periodRange('today', now);
    expect(rangeTotals(tx, today.from, today.to)).toEqual({ income: 1000, expense: 400, net: 600, count: 2, margin: 60 });
    const month = periodRange('month', now);
    expect(rangeTotals(tx, month.from, month.to)).toMatchObject({ income: 1500, expense: 1300, net: 200 });
  });
  it('shows a loss as a negative number and has no margin without income', () => {
    expect(rangeTotals([{ type: 'expense', date: '2026-11-09', amount: 50 }], '2026-11-09', '2026-11-09')).toEqual({ income: 0, expense: 50, net: -50, count: 1, margin: null });
  });
  it('lists the days with entries, newest first', () => {
    const month = periodRange('month', now);
    expect(dailyTotals(tx, month.from, month.to)).toEqual([
      { date: '2026-11-09', income: 1000, expense: 400, net: 600 },
      { date: '2026-11-05', income: 500, expense: 0, net: 500 },
      { date: '2026-11-01', income: 0, expense: 900, net: -900 }
    ]);
  });
});

import { wandaTotals } from '../../src/lib/calc.js';

describe('wandaTotals', () => {
  it('adds up cost, paid, balance and bags over all batches', () => {
    const t = wandaTotals([
      { totalBill: 120000, bags: 30, installments: [{ amount: 30000 }, { amount: 30000 }, { amount: 30000 }] },
      { totalBill: 80000, bags: 20, installments: [{ amount: 10000 }] }
    ]);
    expect(t).toEqual({ cost: 200000, paid: 100000, due: 100000, bags: 50, percent: 50, count: 2 });
  });
  it('handles no batches, missing installments and overpayment', () => {
    expect(wandaTotals([])).toEqual({ cost: 0, paid: 0, due: 0, bags: 0, percent: 0, count: 0 });
    expect(wandaTotals([{ totalBill: 1000, bags: 1 }]).due).toBe(1000);
    expect(wandaTotals([{ totalBill: 1000, installments: [{ amount: 1500 }] }])).toMatchObject({ due: 0, percent: 100 });
  });
});

import { dayDetails } from '../../src/lib/calc.js';
describe('dayDetails', () => {
  it('totals one date and lists income first', () => {
    const txs = [
      { type: 'expense', date: '2026-11-10', amount: 300, category: 'Feed' },
      { type: 'income', date: '2026-11-10', amount: 1000, category: 'Milk Sale' },
      { type: 'income', date: '2026-11-11', amount: 50 }
    ];
    const d = dayDetails(txs, '2026-11-10');
    expect(d).toMatchObject({ income: 1000, expense: 300, net: 700 });
    expect(d.entries.map((t) => t.category)).toEqual(['Milk Sale', 'Feed']);
    expect(dayDetails(txs, '2026-11-12').entries).toEqual([]);
  });
});
