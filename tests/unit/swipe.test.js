import { describe, expect, it } from 'vitest';
import { swipeTarget } from '../../src/ui/swipe.js';

const order = ['finance', 'animals', 'breeding', 'wanda'];
describe('swipeTarget', () => {
  it('swipe left goes to the next tab, right to the previous', () => {
    expect(swipeTarget(order, 'animals', -120, 10)).toBe('breeding');
    expect(swipeTarget(order, 'animals', 120, 10)).toBe('finance');
  });
  it('stops at the ends', () => {
    expect(swipeTarget(order, 'finance', 120, 0)).toBeNull();
    expect(swipeTarget(order, 'wanda', -120, 0)).toBeNull();
  });
  it('ignores short or mostly vertical drags and unknown tabs', () => {
    expect(swipeTarget(order, 'animals', -40, 0)).toBeNull();
    expect(swipeTarget(order, 'animals', -100, 90)).toBeNull();
    expect(swipeTarget(order, 'milkers', -150, 0)).toBeNull();
  });
  it('is mirrored in right-to-left', () => {
    expect(swipeTarget(order, 'animals', 120, 0, true)).toBe('breeding');
    expect(swipeTarget(order, 'animals', -120, 0, true)).toBe('finance');
  });
});
