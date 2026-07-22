import { describe, expect, it } from 'vitest';
import { optionalText, requiredText } from '../src/controllers/ownerApplicationController';

describe('owner application validation', () => {
  it('trims valid required fields', () => {
    expect(requiredText('  Cafe Group  ', 'Business name', 2, 150)).toBe('Cafe Group');
  });

  it('rejects undersized required fields', () => {
    expect(() => requiredText('x', 'Business name', 2, 150)).toThrow();
  });

  it('normalizes empty optional notes to null', () => {
    expect(optionalText('   ', 'Notes', 1000)).toBeNull();
  });

  it('rejects oversized optional notes', () => {
    expect(() => optionalText('x'.repeat(1001), 'Notes', 1000)).toThrow();
  });
});
