import { describe, expect, it } from 'vitest';
import { validPhoto } from '../../src/lib/photo.js';

describe('farm photo', () => {
  it('accepts only small jpeg data urls', () => {
    expect(validPhoto('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe(true);
    expect(validPhoto('javascript:alert(1)')).toBe(false);
    expect(validPhoto('data:image/svg+xml;base64,PHN2Zz4=')).toBe(false);
    expect(validPhoto('data:image/jpeg;base64,abc" onerror="x')).toBe(false);
    expect(validPhoto('')).toBe(false);
    expect(validPhoto(undefined)).toBe(false);
  });
});
