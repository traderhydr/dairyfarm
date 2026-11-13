import { describe, expect, it } from 'vitest';
import { MARK_COLORS, MARK_SYMBOLS, defaultMark, markOf, markOfTag, validMark } from '../../src/lib/marks.js';

describe('marks', () => {
  it('accepts only known pictures and colours', () => {
    expect(validMark({ symbol: '⭐', color: 'red' })).toEqual({ symbol: '⭐', color: 'red' });
    expect(validMark({ symbol: '<b>', color: 'red' })).toBeNull();
    expect(validMark({ symbol: '⭐', color: 'x" onclick="' })).toBeNull();
    expect(validMark(null)).toBeNull();
  });
  it('gives a steady default per tag', () => {
    const a = defaultMark('Cow 12');
    expect(defaultMark('Cow 12')).toEqual(a);
    expect(MARK_SYMBOLS).toContain(a.symbol);
    expect(MARK_COLORS).toContain(a.color);
  });
  it('uses the chosen mark, else the default', () => {
    expect(markOf({ tag: 'A', mark: { symbol: '🌙', color: 'blue' } })).toEqual({ symbol: '🌙', color: 'blue' });
    expect(markOf({ tag: 'A', mark: { symbol: 'bad', color: 'blue' } })).toEqual(defaultMark('A'));
  });
  it('finds the mark of a herd animal by tag', () => {
    const st = { milkersList: [{ tag: 'Lali', mark: { symbol: '🍀', color: 'green' } }] };
    expect(markOfTag(st, 'Lali')).toEqual({ symbol: '🍀', color: 'green' });
    expect(markOfTag(st, 'Nobody')).toBeNull();
  });
});
