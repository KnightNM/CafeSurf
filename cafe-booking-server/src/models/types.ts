// ── Cafe ──────────────────────────────────────────

export interface Cafe {
  id: string;
  owner_id: string | null;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  hourly_rate: number;
  total_slots: number;
  has_generator: boolean;
  wifi_speed_mbps: number;
  google_place_id: string | null;
  google_business_status: string | null;
  google_imported_at: Date | null;
  google_maps_url: string | null;
  cover_image_path: string | null;
  cover_image_url: string | null;
  description: string;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  amenities: CafeAmenity[];
  opening_hours: WeeklyOpeningHours;
  house_rules: string;
  access_instructions: string;
  publication_status: 'published' | 'archived';
  version: number;
  published_at: Date;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCafeRequest {
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  hourly_rate: number;
  total_slots: number;
  has_generator: boolean;
  wifi_speed_mbps: number;
  google_place_id?: string | null;
  google_session_token?: string;
  google_business_status?: string | null;
  google_imported_at?: string | Date | null;
  description?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  website_url?: string | null;
  amenities?: CafeAmenity[];
  opening_hours?: WeeklyOpeningHours;
  house_rules?: string;
  access_instructions?: string;
  remove_cover?: boolean;
}

export interface UpdateCafeRequest extends Partial<CreateCafeRequest> {}

export const CAFE_AMENITIES = [
  'air_conditioning',
  'parking',
  'wheelchair_access',
  'quiet_zone',
  'meeting_room',
  'whiteboard',
  'power_outlets',
  'food_available',
  'outdoor_seating',
] as const;

export type CafeAmenity = typeof CAFE_AMENITIES[number];
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export interface OpeningHoursPeriod { open_minute: number; close_minute: number }
export interface OpeningHoursDay { closed: boolean; periods: OpeningHoursPeriod[] }
export type WeeklyOpeningHours = Record<Weekday, OpeningHoursDay>;

export type CafeRevisionAction = 'create' | 'update' | 'archive';
export type CafeRevisionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
export interface CafeRevision {
  id: string;
  cafe_id: string | null;
  owner_id: string;
  action: CafeRevisionAction;
  proposed_data: Record<string, unknown>;
  proposed_cover_image_path: string | null;
  proposed_cover_content_type: string | null;
  proposed_cover_preview_url?: string | null;
  base_version: number | null;
  status: CafeRevisionStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: Date;
  updated_at: Date;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  live_cafe?: Cafe | null;
}

// ── Booking ───────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'rejected';

export interface Booking {
  id: string;
  user_id: string;
  cafe_id: string;
  date: string;
  start_time: number;
  end_time: number;
  total_price: number;
  team_size: number;
  status: BookingStatus;
  cancellation_reason: string | null;
  created_at: Date;
}

export interface BookingWithCafe extends Booking {
  cafe_name: string;
  cafe_area: string;
}

// ── Request / Response DTOs ───────────────────────

export interface CreateBookingRequest {
  cafe_id: string;
  date: string;       // YYYY-MM-DD
  start_time: number;  // 0–23
  end_time: number;    // 1–24 (exclusive upper bound)
  team_size?: number;  // Defaults to 1 for backward compatibility
}

export interface AvailabilitySlot {
  hour: number;
  available: number;
  total: number;
}

export interface AvailabilityResponse {
  cafe_id: string;
  date: string;
  slots: AvailabilitySlot[];
}

// ── User ───────────────────────────────────────────

export type UserRole = 'admin' | 'cafe_owner' | 'customer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export type OwnerApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface OwnerApplication {
  id: string;
  user_id: string;
  business_name: string;
  contact_phone: string;
  cafe_name: string;
  location: string;
  notes: string | null;
  status: OwnerApplicationStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: Date;
  updated_at: Date;
  reviewed_at: Date | null;
  applicant_name?: string;
  applicant_email?: string;
}

export interface CreateOwnerApplicationRequest {
  business_name: string;
  contact_phone: string;
  cafe_name: string;
  location: string;
  notes?: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface GooglePlaceSuggestion {
  place_id: string;
  name: string;
  address: string;
}

export interface GooglePlaceDetails {
  place_id: string;
  display_name: string;
  formatted_address: string;
  latitude: number;
  longitude: number;
  google_maps_uri: string;
  business_status: string | null;
  phone: string | null;
  website: string | null;
}

export interface GooglePlaceImport {
  place: GooglePlaceDetails;
  suggested_profile: {
    name: string;
    area: string;
    latitude: number;
    longitude: number;
    google_place_id: string;
    google_business_status: string | null;
    google_imported_at: string;
    contact_phone: string | null;
    website_url: string | null;
    description: string | null;
    amenities: CafeAmenity[];
    amenity_evidence: Partial<Record<CafeAmenity, boolean>>;
    opening_hours: WeeklyOpeningHours | null;
  };
  imported_fields: string[];
  warnings: string[];
}
