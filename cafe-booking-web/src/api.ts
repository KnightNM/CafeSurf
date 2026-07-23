import type {
  AvailabilitySlot,
  Booking,
  BookingWithCafe,
  Cafe,
  CafeBooking,
  CreateBookingRequest,
  CreateCafeRequest,
  UpdateCafeRequest,
  OwnerApplication,
  OwnerApplicationStatus,
  CreateOwnerApplicationRequest,
  User,
  CafeCoverUploadTicket,
  GooglePlaceDetails,
  GooglePlaceSuggestion,
} from './types';
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

interface ApiError {
  error?: string;
  details?: string;
}

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ApiError;
      message = [body.error, body.details].filter(Boolean).join(': ') || message;
    } catch {
      // Keep the status-derived message when the server did not return JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ── Public Cafe APIs ───────────────────────────────

export async function fetchCafes(filters: {
  area?: string;
  hasGenerator?: boolean;
  minWifiSpeed?: number;
}): Promise<Cafe[]> {
  const params = new URLSearchParams();
  if (filters.area) params.set('area', filters.area);
  if (filters.hasGenerator !== undefined) params.set('has_generator', String(filters.hasGenerator));
  if (filters.minWifiSpeed) params.set('min_wifi_speed', String(filters.minWifiSpeed));

  const query = params.toString();
  const data = await request<{ cafes: Cafe[] }>(`/api/cafes${query ? `?${query}` : ''}`);
  return data.cafes;
}

export async function fetchCafe(id: string): Promise<Cafe> {
  const data = await request<{ cafe: Cafe }>(`/api/cafes/${id}`);
  return data.cafe;
}

export async function fetchAvailability(cafeId: string, date: string): Promise<AvailabilitySlot[]> {
  const data = await request<{ slots: AvailabilitySlot[] }>(
    `/api/cafes/${cafeId}/availability?date=${encodeURIComponent(date)}`
  );
  return data.slots;
}

export async function autocompleteGooglePlaces(
  token: string,
  input: string,
  sessionToken: string
): Promise<GooglePlaceSuggestion[]> {
  const data = await request<{ suggestions: GooglePlaceSuggestion[] }>(
    '/api/google-places/autocomplete',
    {
      method: 'POST',
      body: JSON.stringify({ input, session_token: sessionToken }),
    },
    token
  );
  return data.suggestions;
}

export async function fetchCafeGooglePlace(
  token: string,
  cafeId: string
): Promise<GooglePlaceDetails> {
  const data = await request<{ place: GooglePlaceDetails }>(
    `/api/google-places/cafes/${cafeId}`,
    undefined,
    token
  );
  return data.place;
}

// ── Booking APIs ───────────────────────────────────

export async function createBooking(payload: CreateBookingRequest, token: string): Promise<Booking> {
  const data = await request<{ booking: Booking }>(
    '/api/bookings',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
  return data.booking;
}

export async function fetchMyBookings(token: string): Promise<BookingWithCafe[]> {
  const data = await request<{ bookings: BookingWithCafe[] }>(
    '/api/bookings',
    undefined,
    token
  );
  return data.bookings;
}

export async function cancelBooking(id: string, token: string): Promise<BookingWithCafe> {
  const data = await request<{ booking: BookingWithCafe }>(
    `/api/bookings/${id}`,
    { method: 'DELETE' },
    token
  );
  return data.booking;
}

export async function checkInBooking(id: string, token: string): Promise<Booking> {
  const data = await request<{ booking: Booking }>(
    `/api/bookings/${id}/checkin`,
    { method: 'POST' },
    token
  );
  return data.booking;
}

export async function updateBookingStatusApi(
  token: string,
  id: string,
  status: 'confirmed' | 'rejected'
): Promise<Booking> {
  const data = await request<{ booking: Booking }>(
    `/api/bookings/${id}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
    token
  );
  return data.booking;
}

export async function getCurrentUser(token: string): Promise<User> {
  const data = await request<{ user: User }>('/api/auth/me', undefined, token);
  return data.user;
}

// ── Cafe Management APIs ───────────────────────────

export async function fetchMyCafes(token: string): Promise<Cafe[]> {
  const data = await request<{ cafes: Cafe[] }>(
    '/api/cafes/management/my-cafes',
    undefined,
    token
  );
  return data.cafes;
}

export async function uploadCafeCoverApi(
  accessToken: string,
  cafeId: string,
  file: File
): Promise<Cafe> {
  const ticket = await request<CafeCoverUploadTicket>(
    `/api/cafes/management/${cafeId}/cover-image/upload-url`,
    {
      method: 'POST',
      body: JSON.stringify({
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
      }),
    },
    accessToken
  );

  const { error: uploadError } = await supabase.storage
    .from('cafe-covers')
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type,
    });
  if (uploadError) throw uploadError;

  const data = await request<{ cafe: Cafe }>(
    `/api/cafes/management/${cafeId}/cover-image`,
    { method: 'PUT', body: JSON.stringify({ path: ticket.path }) },
    accessToken
  );
  return data.cafe;
}

export async function deleteCafeCoverApi(accessToken: string, cafeId: string): Promise<Cafe> {
  const data = await request<{ cafe: Cafe }>(
    `/api/cafes/management/${cafeId}/cover-image`,
    { method: 'DELETE' },
    accessToken
  );
  return data.cafe;
}

export async function createCafeApi(token: string, payload: CreateCafeRequest): Promise<Cafe> {
  const data = await request<{ cafe: Cafe }>(
    '/api/cafes/management',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
  return data.cafe;
}

export async function updateCafeApi(token: string, id: string, payload: UpdateCafeRequest): Promise<Cafe> {
  const data = await request<{ cafe: Cafe }>(
    `/api/cafes/management/${id}`,
    { method: 'PUT', body: JSON.stringify(payload) },
    token
  );
  return data.cafe;
}

export async function deleteCafeApi(token: string, id: string): Promise<void> {
  await request<{ message: string }>(
    `/api/cafes/management/${id}`,
    { method: 'DELETE' },
    token
  );
}

export async function fetchCafeBookings(token: string, cafeId: string): Promise<CafeBooking[]> {
  const data = await request<{ bookings: CafeBooking[] }>(
    `/api/cafes/management/${cafeId}/bookings`,
    undefined,
    token
  );
  return data.bookings;
}

// ── Owner applications ─────────────────────────────

export async function fetchMyOwnerApplication(token: string): Promise<OwnerApplication | null> {
  const data = await request<{ application: OwnerApplication | null }>(
    '/api/owner-applications/me',
    undefined,
    token
  );
  return data.application;
}

export async function createOwnerApplicationApi(
  token: string,
  payload: CreateOwnerApplicationRequest
): Promise<OwnerApplication> {
  const data = await request<{ application: OwnerApplication }>(
    '/api/owner-applications',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
  return data.application;
}

export async function fetchOwnerApplications(
  token: string,
  status: OwnerApplicationStatus
): Promise<OwnerApplication[]> {
  const data = await request<{ applications: OwnerApplication[] }>(
    `/api/admin/owner-applications?status=${status}`,
    undefined,
    token
  );
  return data.applications;
}

export async function decideOwnerApplicationApi(
  token: string,
  id: string,
  decision: 'approved' | 'rejected',
  reviewNote?: string
): Promise<OwnerApplication> {
  const data = await request<{ application: OwnerApplication }>(
    `/api/admin/owner-applications/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ decision, review_note: reviewNote || undefined }),
    },
    token
  );
  return data.application;
}
