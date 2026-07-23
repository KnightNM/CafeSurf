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
}

export type UpdateCafeRequest = Partial<CreateCafeRequest>;

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
