import { describe, expect, it } from 'vitest';
import { amountDue, formatLiters, percentPaid, sumAmounts } from '../../src/lib/calc.js';

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
