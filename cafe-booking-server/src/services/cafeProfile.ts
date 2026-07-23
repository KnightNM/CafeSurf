import {
  CAFE_AMENITIES,
  Cafe,
  CafeAmenity,
  CreateCafeRequest,
  Weekday,
  WeeklyOpeningHours,
} from '../models/types';

export const WEEKDAYS: Weekday[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

export const DEFAULT_OPENING_HOURS: WeeklyOpeningHours = Object.fromEntries(
  WEEKDAYS.map((day) => [day, { closed: false, open: 0, close: 24 }])
) as WeeklyOpeningHours;

const optionalText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (text.length > max) throw new Error(`Text must be ${max} characters or fewer`);
  return text;
};

export function normalizeOpeningHours(value: unknown): WeeklyOpeningHours {
  if (!value || typeof value !== 'object') return DEFAULT_OPENING_HOURS;
  const result = {} as WeeklyOpeningHours;
  for (const day of WEEKDAYS) {
    const raw = (value as Record<string, any>)[day];
    if (!raw || typeof raw !== 'object') throw new Error(`Missing opening hours for ${day}`);
    const closed = Boolean(raw.closed);
    const open = Number(raw.open);
    const close = Number(raw.close);
    if (!Number.isInteger(open) || !Number.isInteger(close) || open < 0 || close > 24 || (!closed && open >= close)) {
      throw new Error(`Invalid opening hours for ${day}`);
    }
    result[day] = { closed, open, close };
  }
  return result;
}

export function normalizeCafeProfile(input: Partial<CreateCafeRequest>, requireGooglePlace = false): CreateCafeRequest {
  const name = String(input.name ?? '').trim();
  const area = String(input.area ?? '').trim();
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const hourly_rate = Number(input.hourly_rate);
  const total_slots = Number(input.total_slots);
  const wifi_speed_mbps = Number(input.wifi_speed_mbps);
  const google_place_id = optionalText(input.google_place_id, 255);

  if (name.length < 2 || name.length > 255) throw new Error('Display name must be 2–255 characters');
  if (area.length < 2 || area.length > 300) throw new Error('A verified address is required');
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Invalid latitude');
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Invalid longitude');
  if (!Number.isInteger(hourly_rate) || hourly_rate < 0) throw new Error('Hourly rate must be a non-negative whole number');
  if (!Number.isInteger(total_slots) || total_slots < 1) throw new Error('Capacity must be a positive whole number');
  if (!Number.isInteger(wifi_speed_mbps) || wifi_speed_mbps < 0) throw new Error('Wi-Fi speed must be a non-negative whole number');
  if (requireGooglePlace && !google_place_id) throw new Error('Select a verified Google place');

  const amenities = Array.isArray(input.amenities) ? [...new Set(input.amenities)] : [];
  if (amenities.some((item) => !CAFE_AMENITIES.includes(item as CafeAmenity))) {
    throw new Error('One or more amenities are not supported');
  }

  return {
    name,
    area,
    latitude,
    longitude,
    hourly_rate,
    total_slots,
    has_generator: Boolean(input.has_generator),
    wifi_speed_mbps,
    google_place_id,
    description: optionalText(input.description, 3000) ?? '',
    contact_phone: optionalText(input.contact_phone, 30),
    contact_email: optionalText(input.contact_email, 254),
    website_url: optionalText(input.website_url, 1000),
    amenities: amenities as CafeAmenity[],
    opening_hours: normalizeOpeningHours(input.opening_hours),
    house_rules: optionalText(input.house_rules, 3000) ?? '',
    access_instructions: optionalText(input.access_instructions, 3000) ?? '',
    remove_cover: Boolean(input.remove_cover),
  };
}

export function cafeToProfile(cafe: Cafe): CreateCafeRequest {
  return {
    name: cafe.name,
    area: cafe.area,
    latitude: Number(cafe.latitude),
    longitude: Number(cafe.longitude),
    hourly_rate: cafe.hourly_rate,
    total_slots: cafe.total_slots,
    has_generator: cafe.has_generator,
    wifi_speed_mbps: cafe.wifi_speed_mbps,
    google_place_id: cafe.google_place_id,
    description: cafe.description,
    contact_phone: cafe.contact_phone,
    contact_email: cafe.contact_email,
    website_url: cafe.website_url,
    amenities: cafe.amenities,
    opening_hours: cafe.opening_hours,
    house_rules: cafe.house_rules,
    access_instructions: cafe.access_instructions,
    remove_cover: false,
  };
}

export function isCafeOpenForRange(hours: WeeklyOpeningHours, date: string, start: number, end: number): boolean {
  const weekdayIndex = new Date(`${date}T12:00:00Z`).getUTCDay();
  const day = WEEKDAYS[(weekdayIndex + 6) % 7] as Weekday;
  const schedule = hours[day];
  return Boolean(schedule && !schedule.closed && start >= schedule.open && end <= schedule.close);
}
