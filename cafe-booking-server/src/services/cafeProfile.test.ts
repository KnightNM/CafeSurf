import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OPENING_HOURS,
  isCafeOpenForRange,
  normalizeCafeProfile,
  normalizeOpeningHours,
} from './cafeProfile';

const profile = {
  name: 'Studio One',
  area: '12 Example Road, Colombo',
  latitude: 6.9271,
  longitude: 79.8612,
  hourly_rate: 500,
  total_slots: 12,
  has_generator: true,
  wifi_speed_mbps: 100,
  google_place_id: 'ChIJ-example',
  amenities: ['meeting_room' as const, 'power_outlets' as const],
  opening_hours: DEFAULT_OPENING_HOURS,
};

describe('cafe profile validation', () => {
  it('requires Google linkage for a new cafe', () => {
    expect(() => normalizeCafeProfile({ ...profile, google_place_id: null }, true))
      .toThrow('Select a verified Google place');
  });

  it('rejects unsupported amenities', () => {
    expect(() => normalizeCafeProfile({ ...profile, amenities: ['pool' as never] }, true))
      .toThrow('not supported');
  });

  it('rejects invalid daily ranges', () => {
    expect(() => normalizeOpeningHours({
      ...DEFAULT_OPENING_HOURS,
      monday: { closed: false, periods: [{ open_minute: 1080, close_minute: 540 }] },
    })).toThrow('Invalid opening hours for monday');
  });

  it('uses the CafeSurf schedule to validate a booking range', () => {
    const hours = {
      ...DEFAULT_OPENING_HOURS,
      thursday: {
        closed: false,
        periods: [
          { open_minute: 8 * 60 + 30, close_minute: 12 * 60 },
          { open_minute: 13 * 60, close_minute: 18 * 60 + 30 },
        ],
      },
    };
    expect(isCafeOpenForRange(hours, '2026-07-23', 9, 12)).toBe(true);
    expect(isCafeOpenForRange(hours, '2026-07-23', 12, 14)).toBe(false);
    expect(isCafeOpenForRange(hours, '2026-07-23', 17, 19)).toBe(false);
  });

  it('upgrades the legacy one-period schedule shape', () => {
    const legacy = Object.fromEntries(
      Object.keys(DEFAULT_OPENING_HOURS).map((day) => [day, { closed: false, open: 8, close: 18 }])
    );
    expect(normalizeOpeningHours(legacy).monday.periods).toEqual([
      { open_minute: 480, close_minute: 1080 },
    ]);
  });
});
