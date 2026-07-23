import type {
  CafeAmenity,
  GooglePlaceImport,
  GooglePlaceDetails,
  GooglePlaceSuggestion,
  Weekday,
  WeeklyOpeningHours,
} from '../models/types';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const AUTOCOMPLETE_FIELD_MASK = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.structuredFormat.mainText.text',
  'suggestions.placePrediction.structuredFormat.secondaryText.text',
].join(',');
const CORE_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'googleMapsUri',
  'businessStatus',
  'movedPlace',
  'movedPlaceId',
].join(',');
const IMPORT_DETAILS_FIELD_MASK = [
  CORE_DETAILS_FIELD_MASK,
  'nationalPhoneNumber',
  'websiteUri',
  'editorialSummary',
  'regularOpeningHours.periods',
  'accessibilityOptions',
  'parkingOptions',
  'outdoorSeating',
  'dineIn',
  'servesBreakfast',
  'servesBrunch',
  'servesLunch',
  'servesDinner',
  'servesDessert',
].join(',');

interface GoogleApiErrorBody {
  error?: {
    message?: string;
  };
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

interface PlaceDetailsResponse {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  businessStatus?: string;
  movedPlace?: string;
  movedPlaceId?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  editorialSummary?: { text?: string };
  regularOpeningHours?: {
    periods?: GoogleOpeningPeriod[];
  };
  accessibilityOptions?: {
    wheelchairAccessibleEntrance?: boolean;
    wheelchairAccessibleSeating?: boolean;
  };
  parkingOptions?: Record<string, boolean | undefined>;
  outdoorSeating?: boolean;
  dineIn?: boolean;
  servesBreakfast?: boolean;
  servesBrunch?: boolean;
  servesLunch?: boolean;
  servesDinner?: boolean;
  servesDessert?: boolean;
}

function assertPlaceLinkable(place: PlaceDetailsResponse): void {
  if (place.movedPlace || place.movedPlaceId || place.businessStatus === 'CLOSED_PERMANENTLY') {
    throw { statusCode: 409, message: 'This Google place is permanently closed or has moved' };
  }
}

interface GoogleOpeningPoint {
  day?: number;
  hour?: number;
  minute?: number;
}

interface GoogleOpeningPeriod {
  open?: GoogleOpeningPoint;
  close?: GoogleOpeningPoint;
}

const GOOGLE_DAYS: Weekday[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function googleApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    throw {
      statusCode: 503,
      message: 'Google Places is not configured on this server',
    };
  }
  return key;
}

async function googleRequest<T>(
  url: string,
  fieldMask: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleApiKey(),
      'X-Goog-FieldMask': fieldMask,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Google Places request failed with status ${response.status}`;
    try {
      const body = await response.json() as GoogleApiErrorBody;
      if (body.error?.message) message = body.error.message;
    } catch {
      // Retain the status-derived error when Google did not return JSON.
    }
    throw { statusCode: 502, message };
  }

  return response.json() as Promise<T>;
}

export function validatePlaceInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw { statusCode: 400, message: 'Search text is required' };
  }
  const normalized = input.trim();
  if (normalized.length < 2 || normalized.length > 150) {
    throw { statusCode: 400, message: 'Search text must be 2-150 characters' };
  }
  return normalized;
}

export function validateSessionToken(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8 || value.length > 100) {
    throw { statusCode: 400, message: 'A valid autocomplete session token is required' };
  }
  return value;
}

export function validatePlaceId(value: unknown): string {
  if (typeof value !== 'string' || value.length < 5 || value.length > 255 || value.includes('/')) {
    throw { statusCode: 400, message: 'A valid Google Place ID is required' };
  }
  return value;
}

export async function autocompleteGooglePlaces(
  input: string,
  sessionToken: string
): Promise<GooglePlaceSuggestion[]> {
  const body = await googleRequest<AutocompleteResponse>(
    AUTOCOMPLETE_URL,
    AUTOCOMPLETE_FIELD_MASK,
    {
      method: 'POST',
      body: JSON.stringify({
        input: validatePlaceInput(input),
        sessionToken: validateSessionToken(sessionToken),
        includedRegionCodes: ['lk'],
        languageCode: 'en',
        regionCode: 'lk',
      }),
    }
  );

  return (body.suggestions ?? []).flatMap((suggestion) => {
    const prediction = suggestion.placePrediction;
    const placeId = prediction?.placeId;
    const name = prediction?.structuredFormat?.mainText?.text;
    if (!placeId || !name) return [];
    return [{
      place_id: placeId,
      name,
      address: prediction.structuredFormat?.secondaryText?.text ?? '',
    }];
  });
}

export async function getGooglePlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<GooglePlaceDetails> {
  const validatedPlaceId = validatePlaceId(placeId);
  const query = new URLSearchParams({
    languageCode: 'en',
    regionCode: 'lk',
  });
  if (sessionToken) query.set('sessionToken', validateSessionToken(sessionToken));

  const place = await googleRequest<PlaceDetailsResponse>(
    `${PLACE_DETAILS_URL}/${encodeURIComponent(validatedPlaceId)}?${query}`,
    CORE_DETAILS_FIELD_MASK
  );
  assertPlaceLinkable(place);

  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const displayName = place.displayName?.text;
  if (
    !place.id ||
    !displayName ||
    !place.formattedAddress ||
    typeof latitude !== 'number' ||
    typeof longitude !== 'number'
  ) {
    throw { statusCode: 502, message: 'Google Places returned incomplete location details' };
  }

  return {
    place_id: place.id,
    display_name: displayName,
    formatted_address: place.formattedAddress,
    latitude,
    longitude,
    google_maps_uri: place.googleMapsUri
      ?? buildGoogleMapsUrl(displayName, place.formattedAddress, place.id)!,
    business_status: place.businessStatus ?? null,
    phone: null,
    website: null,
  };
}

function minuteOfWeek(point: GoogleOpeningPoint): number | null {
  const day = Number(point.day);
  const hour = Number(point.hour ?? 0);
  const minute = Number(point.minute ?? 0);
  if (
    !Number.isInteger(day) || day < 0 || day > 6
    || !Number.isInteger(hour) || hour < 0 || hour > 23
    || !Number.isInteger(minute) || minute < 0 || minute > 59
  ) return null;
  return day * 1440 + hour * 60 + minute;
}

export function normalizeGoogleOpeningHours(
  periods: GoogleOpeningPeriod[] | undefined
): WeeklyOpeningHours | null {
  if (!periods?.length) return null;
  const byDay = Object.fromEntries(
    GOOGLE_DAYS.map((day) => [day, [] as Array<{ open_minute: number; close_minute: number }>])
  ) as Record<Weekday, Array<{ open_minute: number; close_minute: number }>>;

  for (const period of periods) {
    if (!period.open) continue;
    const start = minuteOfWeek(period.open);
    if (start === null) continue;
    let end = period.close ? minuteOfWeek(period.close) : null;
    if (end === null) end = start + 10080;
    if (end <= start) end += 10080;
    if (end - start > 10080) end = start + 10080;

    let cursor = start;
    while (cursor < end) {
      const absoluteDay = Math.floor(cursor / 1440);
      const dayStart = absoluteDay * 1440;
      const segmentEnd = Math.min(end, dayStart + 1440);
      const day = GOOGLE_DAYS[((absoluteDay % 7) + 7) % 7] as Weekday;
      byDay[day].push({
        open_minute: cursor - dayStart,
        close_minute: segmentEnd - dayStart,
      });
      cursor = segmentEnd;
    }
  }

  const result = {} as WeeklyOpeningHours;
  let hasPeriods = false;
  for (const day of GOOGLE_DAYS) {
    const periodsForDay = byDay[day]
      .filter((period) => period.open_minute < period.close_minute)
      .sort((a, b) => a.open_minute - b.open_minute)
      .reduce<Array<{ open_minute: number; close_minute: number }>>((merged, period) => {
        const previous = merged[merged.length - 1];
        if (previous && period.open_minute <= previous.close_minute) {
          previous.close_minute = Math.max(previous.close_minute, period.close_minute);
        } else {
          merged.push({ ...period });
        }
        return merged;
      }, []);
    hasPeriods ||= periodsForDay.length > 0;
    result[day] = { closed: periodsForDay.length === 0, periods: periodsForDay };
  }
  return hasPeriods ? result : null;
}

function placeDetails(place: PlaceDetailsResponse): GooglePlaceDetails {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  const displayName = place.displayName?.text;
  if (
    !place.id || !displayName || !place.formattedAddress
    || typeof latitude !== 'number' || typeof longitude !== 'number'
  ) {
    throw { statusCode: 502, message: 'Google Places returned incomplete location details' };
  }
  return {
    place_id: place.id,
    display_name: displayName,
    formatted_address: place.formattedAddress,
    latitude,
    longitude,
    google_maps_uri: place.googleMapsUri
      ?? buildGoogleMapsUrl(displayName, place.formattedAddress, place.id)!,
    business_status: place.businessStatus ?? null,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
  };
}

export async function getGooglePlaceImport(
  placeId: string,
  sessionToken: string
): Promise<GooglePlaceImport> {
  const validatedPlaceId = validatePlaceId(placeId);
  const query = new URLSearchParams({
    languageCode: 'en',
    regionCode: 'lk',
    sessionToken: validateSessionToken(sessionToken),
  });
  const raw = await googleRequest<PlaceDetailsResponse>(
    `${PLACE_DETAILS_URL}/${encodeURIComponent(validatedPlaceId)}?${query}`,
    IMPORT_DETAILS_FIELD_MASK
  );
  assertPlaceLinkable(raw);

  const place = placeDetails(raw);
  const evidence: Partial<Record<CafeAmenity, boolean>> = {};
  const parkingValues = raw.parkingOptions ? Object.values(raw.parkingOptions) : [];
  if (parkingValues.length) evidence.parking = parkingValues.some(Boolean);
  const accessValues = [
    raw.accessibilityOptions?.wheelchairAccessibleEntrance,
    raw.accessibilityOptions?.wheelchairAccessibleSeating,
  ].filter((value): value is boolean => typeof value === 'boolean');
  if (accessValues.length) evidence.wheelchair_access = accessValues.some(Boolean);
  if (typeof raw.outdoorSeating === 'boolean') evidence.outdoor_seating = raw.outdoorSeating;
  const foodValues = [
    raw.dineIn, raw.servesBreakfast, raw.servesBrunch, raw.servesLunch,
    raw.servesDinner, raw.servesDessert,
  ].filter((value): value is boolean => typeof value === 'boolean');
  if (foodValues.length) evidence.food_available = foodValues.some(Boolean);

  const amenities = Object.entries(evidence)
    .filter(([, enabled]) => enabled)
    .map(([amenity]) => amenity as CafeAmenity);
  const openingHours = normalizeGoogleOpeningHours(raw.regularOpeningHours?.periods);
  const importedAt = new Date().toISOString();
  const importedFields = [
    'name', 'area', 'latitude', 'longitude', 'google_place_id', 'google_business_status',
    ...(raw.nationalPhoneNumber ? ['contact_phone'] : []),
    ...(raw.websiteUri ? ['website_url'] : []),
    ...(raw.editorialSummary?.text ? ['description'] : []),
    ...(Object.keys(evidence).length ? ['amenities'] : []),
    ...(openingHours ? ['opening_hours'] : []),
  ];
  return {
    place,
    suggested_profile: {
      name: place.display_name,
      area: place.formatted_address,
      latitude: place.latitude,
      longitude: place.longitude,
      google_place_id: place.place_id,
      google_business_status: place.business_status,
      google_imported_at: importedAt,
      contact_phone: place.phone,
      website_url: place.website,
      description: raw.editorialSummary?.text ?? null,
      amenities,
      amenity_evidence: evidence,
      opening_hours: openingHours,
    },
    imported_fields: importedFields,
    warnings: raw.businessStatus === 'CLOSED_TEMPORARILY'
      ? ['Google currently lists this café as temporarily closed.']
      : [],
  };
}

export function buildGoogleMapsUrl(
  name: string,
  address: string,
  placeId: string | null | undefined
): string | null {
  if (!placeId) return null;
  const query = new URLSearchParams({
    api: '1',
    query: `${name}, ${address}`,
    query_place_id: placeId,
  });
  return `https://www.google.com/maps/search/?${query}`;
}
