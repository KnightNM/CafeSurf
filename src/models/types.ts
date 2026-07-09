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
}

export interface UpdateCafeRequest extends Partial<CreateCafeRequest> {}

// ── Booking ───────────────────────────────────────

export type BookingStatus = 'reserved' | 'checked_in' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  user_id: string;
  cafe_id: string;
  date: string;
  start_time: number;
  end_time: number;
  total_price: number;
  status: BookingStatus;
  created_at: Date;
}

export interface BookingWithCafe extends Booking {
  cafe_name: string;
  cafe_area: string;
}

// ── Request / Response DTOs ───────────────────────

export interface CreateBookingRequest {
  user_id: string;
  cafe_id: string;
  date: string;       // YYYY-MM-DD
  start_time: number;  // 0–23
  end_time: number;    // 1–24 (exclusive upper bound)
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

export interface UserWithPassword extends User {
  password_hash: string;
}

// ── Auth DTOs ───────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  error: string;
  details?: string;
}
