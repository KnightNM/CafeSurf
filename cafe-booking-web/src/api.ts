import type {
  AvailabilitySlot,
  Booking,
  BookingWithCafe,
  Cafe,
  CafeBooking,
  CreateBookingRequest,
  CreateCafeRequest,
  UpdateCafeRequest,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  User,
} from './types';

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

export async function fetchAvailability(cafeId: string, date: string): Promise<AvailabilitySlot[]> {
  const data = await request<{ slots: AvailabilitySlot[] }>(
    `/api/cafes/${cafeId}/availability?date=${encodeURIComponent(date)}`
  );
  return data.slots;
}

// ── Booking APIs ───────────────────────────────────

export async function createBooking(payload: CreateBookingRequest, token?: string): Promise<Booking> {
  const data = await request<{ booking: Booking }>(
    '/api/bookings',
    { method: 'POST', body: JSON.stringify(payload) },
    token
  );
  return data.booking;
}

export async function fetchMyBookings(userId: string, token?: string): Promise<BookingWithCafe[]> {
  const data = await request<{ bookings: BookingWithCafe[] }>(
    `/api/bookings?user_id=${encodeURIComponent(userId)}`,
    undefined,
    token
  );
  return data.bookings;
}

export async function cancelBooking(id: string, userId: string, token?: string): Promise<BookingWithCafe> {
  const data = await request<{ booking: BookingWithCafe }>(
    `/api/bookings/${id}?user_id=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
    token
  );
  return data.booking;
}

export async function checkInBooking(id: string, token?: string): Promise<Booking> {
  const data = await request<{ booking: Booking }>(
    `/api/bookings/${id}/checkin`,
    { method: 'POST' },
    token
  );
  return data.booking;
}

// ── Auth API ───────────────────────────────────────

export async function register(payload: RegisterRequest): Promise<AuthResponse> {
  const data = await request<{ user: User; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { user: data.user, token: data.token };
}

export async function login(payload: LoginRequest): Promise<AuthResponse> {
  const data = await request<{ user: User; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { user: data.user, token: data.token };
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
