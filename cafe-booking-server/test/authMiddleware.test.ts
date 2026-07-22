import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  oneOrNone: vi.fn(),
}));

vi.mock('../src/config/supabase', () => ({
  supabaseAuth: { auth: { getUser: mocks.getUser } },
}));
vi.mock('../src/config/database', () => ({
  db: { oneOrNone: mocks.oneOrNone },
}));

import { authenticate } from '../src/middleware/auth';

function responseMock() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('authenticate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects requests without a bearer token', async () => {
    const req = { headers: {} } as Request;
    const res = responseMock();
    await authenticate(req, res as unknown as Response, vi.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it('rejects valid Auth identities without an app profile', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-id' } }, error: null });
    mocks.oneOrNone.mockResolvedValue(null);
    const req = { headers: { authorization: 'Bearer token' } } as Request;
    const res = responseMock();
    await authenticate(req, res as unknown as Response, vi.fn() as NextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('loads role from PostgreSQL instead of token metadata', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'auth-id', user_metadata: { role: 'admin' } } },
      error: null,
    });
    mocks.oneOrNone.mockResolvedValue({
      id: 'auth-id', email: 'owner@example.com', name: 'Owner', role: 'cafe_owner',
    });
    const req = { headers: { authorization: 'Bearer token' } } as Request;
    const res = responseMock();
    const next = vi.fn();
    await authenticate(req, res as unknown as Response, next as NextFunction);
    expect(req.userRole).toBe('cafe_owner');
    expect(next).toHaveBeenCalledOnce();
  });
});
