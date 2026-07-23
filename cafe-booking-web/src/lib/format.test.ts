import { describe, expect, it } from 'vitest';
import { hourLabel, largestContiguousBlock } from './format';

describe('booking display helpers', () => {
  it('formats midnight, morning, and afternoon hours', () => {
    expect(hourLabel(0)).toBe('12:00 AM');
    expect(hourLabel(9)).toBe('9:00 AM');
    expect(hourLabel(15)).toBe('3:00 PM');
  });

  it('keeps only the largest contiguous selection', () => {
    expect(largestContiguousBlock([9, 10, 13])).toEqual([9, 10]);
    expect(largestContiguousBlock([])).toEqual([]);
  });
});
