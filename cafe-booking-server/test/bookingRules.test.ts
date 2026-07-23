import { describe, expect, it } from 'vitest';
import {
  calculateBookingTotal,
  hasSeatCapacity,
  normalizeTeamSize,
} from '../src/controllers/bookingController';

describe('team booking rules', () => {
  it('defaults omitted team size to one for backward compatibility', () => {
    expect(normalizeTeamSize(undefined)).toBe(1);
  });

  it('rejects invalid team sizes', () => {
    expect(normalizeTeamSize(0)).toBeNull();
    expect(normalizeTeamSize(1.5)).toBeNull();
    expect(normalizeTeamSize('2')).toBeNull();
  });

  it('prices each seat for every booked hour', () => {
    expect(calculateBookingTotal(500, 9, 12, 4)).toBe(6000);
  });

  it('allows an exact capacity match and rejects overflow', () => {
    expect(hasSeatCapacity(6, 4, 10)).toBe(true);
    expect(hasSeatCapacity(7, 4, 10)).toBe(false);
  });
});
