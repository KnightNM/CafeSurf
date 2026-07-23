import { describe, expect, it } from 'vitest';
import type { GooglePlaceImport } from '../types';
import { applyGoogleImport, createEmptyProfile } from './CafeProfileForm';

const imported: GooglePlaceImport = {
  place: {
    place_id: 'google-id',
    display_name: 'Imported Café',
    formatted_address: '10 Galle Road, Colombo',
    latitude: 6.91,
    longitude: 79.85,
    google_maps_uri: 'https://maps.google.com/example',
    business_status: 'OPERATIONAL',
    phone: '0112345678',
    website: 'https://example.com',
  },
  suggested_profile: {
    name: 'Imported Café',
    area: '10 Galle Road, Colombo',
    latitude: 6.91,
    longitude: 79.85,
    google_place_id: 'google-id',
    google_business_status: 'OPERATIONAL',
    google_imported_at: '2026-07-23T00:00:00.000Z',
    contact_phone: '0112345678',
    website_url: 'https://example.com',
    description: 'Imported summary',
    amenities: ['parking'],
    amenity_evidence: { parking: true, outdoor_seating: false },
    opening_hours: null,
  },
  imported_fields: ['name', 'area', 'latitude', 'longitude', 'amenities'],
  warnings: [],
};

describe('Google profile import merge', () => {
  it('applies explicit amenity evidence without removing unknown manual amenities', () => {
    const current = {
      ...createEmptyProfile(),
      amenities: ['quiet_zone', 'outdoor_seating'] as const,
    };
    const result = applyGoogleImport(
      { ...current, amenities: [...current.amenities] },
      imported,
      new Set(['location', 'amenities'])
    );
    expect(result.amenities).toContain('quiet_zone');
    expect(result.amenities).toContain('parking');
    expect(result.amenities).not.toContain('outdoor_seating');
  });

  it('preserves optional profile fields when they are not selected', () => {
    const current = {
      ...createEmptyProfile(),
      description: 'Owner description',
      contact_phone: '0770000000',
    };
    const result = applyGoogleImport(current, imported, new Set(['location']));
    expect(result.description).toBe('Owner description');
    expect(result.contact_phone).toBe('0770000000');
    expect(result.latitude).toBe(6.91);
  });
});
