// ── Cafe ──────────────────────────────────────────

export interface Cafe {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  hourly_rate: number;
  total_slots: number;
  has_generator: boolean;
  wifi_speed_mbps: number;
  created_at: Date;
}

// ── Booking ───────────────────────────────────────

export type BookingStatus = 'reserved' | 'checked_in' | 'completed';

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

export interface ApiError {
  error: string;
  details?: string;
}
