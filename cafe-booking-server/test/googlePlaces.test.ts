import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  autocompleteGooglePlaces,
  buildGoogleMapsUrl,
  getGooglePlaceImport,
  getGooglePlaceDetails,
  normalizeGoogleOpeningHours,
  validatePlaceId,
} from '../src/services/googlePlaces';

describe('Google Places service', () => {
  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-server-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it('restricts autocomplete to Sri Lanka and returns normalized suggestions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [{
          placePrediction: {
            placeId: 'google-place-id',
            structuredFormat: {
              mainText: { text: 'Cafe Surf' },
              secondaryText: { text: 'Colombo, Sri Lanka' },
            },
          },
        }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const suggestions = await autocompleteGooglePlaces(
      'Cafe Surf',
      'session-token-123'
    );

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody.includedRegionCodes).toEqual(['lk']);
    expect(requestBody.sessionToken).toBe('session-token-123');
    expect(suggestions).toEqual([{
      place_id: 'google-place-id',
      name: 'Cafe Surf',
      address: 'Colombo, Sri Lanka',
    }]);
  });

  it('normalizes live place details and keeps the autocomplete session token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'google-place-id',
        displayName: { text: 'Cafe Surf' },
        formattedAddress: '10 Galle Road, Colombo, Sri Lanka',
        location: { latitude: 6.91, longitude: 79.85 },
        googleMapsUri: 'https://maps.google.com/example',
        businessStatus: 'OPERATIONAL',
        nationalPhoneNumber: '0112 345 678',
        websiteUri: 'https://cafesurf.example',
        regularOpeningHours: { weekdayDescriptions: ['Monday: 8:00 AM – 8:00 PM'] },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const place = await getGooglePlaceDetails('google-place-id', 'session-token-123');

    expect(fetchMock.mock.calls[0][0]).toContain('sessionToken=session-token-123');
    expect(place).toMatchObject({
      place_id: 'google-place-id',
      display_name: 'Cafe Surf',
      formatted_address: '10 Galle Road, Colombo, Sri Lanka',
      latitude: 6.91,
      longitude: 79.85,
      business_status: 'OPERATIONAL',
    });
  });

  it('rejects path-like place IDs and creates a no-key Google Maps URL', () => {
    expect(() => validatePlaceId('../places/id')).toThrow();
    expect(buildGoogleMapsUrl('Cafe Surf', 'Colombo', 'place-id')).toContain(
      'query_place_id=place-id'
    );
  });

  it('imports supported amenities, summary, and split opening periods without inventing unknowns', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'google-place-id',
        displayName: { text: 'Cafe Surf' },
        formattedAddress: '10 Galle Road, Colombo, Sri Lanka',
        location: { latitude: 6.91, longitude: 79.85 },
        businessStatus: 'OPERATIONAL',
        nationalPhoneNumber: '0112 345 678',
        websiteUri: 'https://cafesurf.example',
        editorialSummary: { text: 'A bright neighbourhood workspace.' },
        parkingOptions: { freeStreetParking: true },
        accessibilityOptions: { wheelchairAccessibleEntrance: true },
        outdoorSeating: false,
        dineIn: true,
        regularOpeningHours: {
          periods: [
            { open: { day: 1, hour: 8, minute: 30 }, close: { day: 1, hour: 12, minute: 0 } },
            { open: { day: 1, hour: 13, minute: 0 }, close: { day: 1, hour: 18, minute: 45 } },
          ],
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const imported = await getGooglePlaceImport('google-place-id', 'session-token-123');

    expect(imported.suggested_profile.description).toBe('A bright neighbourhood workspace.');
    expect(imported.suggested_profile.amenity_evidence).toMatchObject({
      parking: true,
      wheelchair_access: true,
      outdoor_seating: false,
      food_available: true,
    });
    expect(imported.suggested_profile.amenities).not.toContain('outdoor_seating');
    expect(imported.suggested_profile.opening_hours?.monday.periods).toEqual([
      { open_minute: 510, close_minute: 720 },
      { open_minute: 780, close_minute: 1125 },
    ]);
  });

  it('splits overnight Google hours at midnight', () => {
    const hours = normalizeGoogleOpeningHours([{
      open: { day: 5, hour: 20, minute: 0 },
      close: { day: 6, hour: 2, minute: 30 },
    }]);
    expect(hours?.friday.periods).toEqual([{ open_minute: 1200, close_minute: 1440 }]);
    expect(hours?.saturday.periods).toEqual([{ open_minute: 0, close_minute: 150 }]);
  });

  it('rejects permanently closed Google places during import', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'closed-place-id',
        displayName: { text: 'Closed Cafe' },
        formattedAddress: 'Colombo, Sri Lanka',
        location: { latitude: 6.91, longitude: 79.85 },
        businessStatus: 'CLOSED_PERMANENTLY',
      }),
    }));
    await expect(getGooglePlaceImport('closed-place-id', 'session-token-123'))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});
