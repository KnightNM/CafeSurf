export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'rejected';

export type UserRole = 'admin' | 'cafe_owner' | 'customer';

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
  google_maps_url: string | null;
  cover_image_path?: string | null;
  cover_image_url: string | null;
  created_at?: string;
  updated_at?: string;
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
  published_at?: string;
  archived_at?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  hour: number;
  available: number;
  total: number;
}

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
  created_at?: string;
  cancellation_reason?: string | null;
}

export interface BookingWithCafe extends Booking {
  cafe_name: string;
  cafe_area: string;
}

export interface CreateBookingRequest {
  cafe_id: string;
  date: string;
  start_time: number;
  end_time: number;
  team_size: number;
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
  description: string;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  amenities: CafeAmenity[];
  opening_hours: WeeklyOpeningHours;
  house_rules: string;
  access_instructions: string;
  remove_cover?: boolean;
}

export type UpdateCafeRequest = Partial<CreateCafeRequest>;

export const CAFE_AMENITIES = [
  'air_conditioning', 'parking', 'wheelchair_access', 'quiet_zone',
  'meeting_room', 'whiteboard', 'power_outlets', 'food_available',
  'outdoor_seating',
] as const;
export type CafeAmenity = typeof CAFE_AMENITIES[number];
export type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type WeeklyOpeningHours = Record<Weekday, { closed: boolean; open: number; close: number }>;

export type CafeRevisionAction = 'create' | 'update' | 'archive';
export type CafeRevisionStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn';
export interface CafeRevision {
  id: string;
  cafe_id: string | null;
  owner_id: string;
  action: CafeRevisionAction;
  proposed_data: CreateCafeRequest;
  proposed_cover_image_path: string | null;
  proposed_cover_preview_url?: string | null;
  base_version: number | null;
  status: CafeRevisionStatus;
  review_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
  live_cafe?: Cafe | null;
  owner_name?: string;
  owner_email?: string;
}

export type HomeSummary =
  | { kind: 'public'; empty: boolean; cafe_id?: string; cafe_name?: string; date?: string; next_hour?: number; available_seats?: number; wifi_speed_mbps?: number; hourly_rate?: number }
  | { kind: 'customer'; empty: boolean; booking?: { booking_id: string; date: string; start_time: number; end_time: number; team_size: number; status: BookingStatus; cafe_id: string; cafe_name: string }; fallback?: HomeSummary }
  | { kind: 'owner'; empty: boolean; published_cafes: number; pending_bookings: number; next_request: null | { booking_id: string; date: string; start_time: number; end_time: number; team_size: number; cafe_id: string; cafe_name: string } }
  | { kind: 'admin'; empty: boolean; published_cafes: number; pending_cafe_revisions: number; pending_owner_applications: number; bookings_today: number };

export interface CafeBooking extends Booking {
  user_name: string;
  user_email: string;
}

export interface BookingIntent {
  cafeId: string;
  date: string;
  selectedHours: number[];
  teamSize: number;
}

export interface CafeCoverUploadTicket {
  path: string;
  token: string;
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
  opening_hours: string[];
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
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
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
