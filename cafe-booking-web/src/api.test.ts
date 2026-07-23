import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelBooking, createBooking, fetchMyBookings } from './api';

afterEach(() => vi.unstubAllGlobals());

function mockFetch(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => body,
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('authenticated booking API', () => {
  it('fetches only the authenticated user without a user_id query parameter', async () => {
    const fetchMock = mockFetch({ bookings: [] });
    await fetchMyBookings('access-token');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/api/bookings',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer access-token' }) })
    );
  });

  it('cancels by booking ID without a user_id query parameter', async () => {
    const fetchMock = mockFetch({ booking: { id: 'booking-id' } });
    await cancelBooking('booking-id', 'access-token');
    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:3000/api/bookings/booking-id');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('creates a booking without accepting a user ID', async () => {
    const fetchMock = mockFetch({ booking: { id: 'booking-id' } });
    await createBooking({
      cafe_id: 'cafe-id', date: '2026-08-01', start_time: 9, end_time: 10, team_size: 4,
    }, 'access-token');
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(requestBody).not.toHaveProperty('user_id');
    expect(requestBody.team_size).toBe(4);
  });
});
