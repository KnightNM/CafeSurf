import type {
  GooglePlaceDetails,
  GooglePlaceSuggestion,
} from '../models/types';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const AUTOCOMPLETE_FIELD_MASK = [
  'suggestions.placePrediction.placeId',
  'suggestions.placePrediction.structuredFormat.mainText.text',
  'suggestions.placePrediction.structuredFormat.secondaryText.text',
].join(',');
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'googleMapsUri',
  'businessStatus',
  'nationalPhoneNumber',
  'websiteUri',
  'regularOpeningHours.weekdayDescriptions',
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
  nationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
}

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
    DETAILS_FIELD_MASK
  );

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
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    opening_hours: place.regularOpeningHours?.weekdayDescriptions ?? [],
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
