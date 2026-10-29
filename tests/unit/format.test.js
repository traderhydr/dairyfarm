import { describe, expect, it } from 'vitest';
import { addDays, escapeHtml, formatCurrency, formatDisplayDate } from '../../src/lib/format.js';

describe('format helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-27', 21)).toBe(formatDisplayDate('2026-11-17'));
    expect(addDays('2026-08-15', 283)).toBe(formatDisplayDate('2027-05-25'));
  });

  it('returns a dash for missing or invalid dates', () => {
    expect(addDays('', 21)).toBe('—');
    expect(addDays('not-a-date', 21)).toBe('—');
    expect(formatDisplayDate('')).toBe('—');
  });

  it('formats currency with Rs. prefix and tolerates junk', () => {
    expect(formatCurrency(14500)).toBe('Rs. 14,500');
    expect(formatCurrency('abc')).toBe('Rs. 0');
  });

  it('escapes HTML special characters', () => {
    expect(escapeHtml(`<b a="1">'&'</b>`)).toBe('&lt;b a=&quot;1&quot;&gt;&#039;&amp;&#039;&lt;/b&gt;');
  });
});
