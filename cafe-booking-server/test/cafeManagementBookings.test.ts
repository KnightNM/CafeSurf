import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const mocks = vi.hoisted(() => ({
  oneOrNone: vi.fn(),
  any: vi.fn(),
}));

vi.mock('../src/config/database', () => ({
  db: {
    oneOrNone: mocks.oneOrNone,
    any: mocks.any,
  },
}));

vi.mock('../src/config/supabase', () => ({
  CAFE_COVERS_BUCKET: 'cafe-covers',
  getCafeCoverPublicUrl: vi.fn(() => null),
  getSupabaseAdmin: vi.fn(),
}));

import { getCafeBookings } from '../src/controllers/cafeManagementController';

function responseMock() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('getCafeBookings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('joins Supabase UUID profiles directly and returns the cafe bookings', async () => {
    mocks.oneOrNone.mockResolvedValue({
      id: 'cafe-id',
      owner_id: 'owner-id',
    });
    const bookings = [{
      id: 'booking-id',
      cafe_id: 'cafe-id',
      user_id: 'customer-id',
      team_size: 2,
      user_name: 'Customer',
      user_email: 'customer@example.com',
    }];
    mocks.any.mockResolvedValue(bookings);

    const req = {
      params: { id: 'cafe-id' },
      userId: 'owner-id',
      userRole: 'cafe_owner',
    } as unknown as Request;
    const res = responseMock();

    await getCafeBookings(req, res as unknown as Response);

    expect(mocks.any).toHaveBeenCalledWith(
      expect.stringContaining('JOIN public.users u ON u.id = b.user_id'),
      ['cafe-id']
    );
    expect(res.json).toHaveBeenCalledWith({ bookings });
    expect(res.status).not.toHaveBeenCalled();
  });
});
