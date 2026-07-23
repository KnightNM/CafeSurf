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
  google_maps_url: string | null;
  cover_image_path: string | null;
  cover_image_url: string | null;
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
}

export interface UpdateCafeRequest extends Partial<CreateCafeRequest> {}

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
  opening_hours: string[];
}
