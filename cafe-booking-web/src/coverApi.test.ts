import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  uploadToSignedUrl: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: () => ({ uploadToSignedUrl: mocks.uploadToSignedUrl }),
    },
  },
}));

import { uploadCafeCoverApi } from './api';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('cafe cover upload API', () => {
  it('uses a signed upload and then attaches the verified path', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ path: 'cafe-id/image.webp', token: 'upload-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ cafe: { id: 'cafe-id', cover_image_url: 'https://cdn/image.webp' } }),
      });
    vi.stubGlobal('fetch', fetchMock);
    mocks.uploadToSignedUrl.mockResolvedValue({ error: null });
    const file = new File(['workspace'], 'workspace.webp', { type: 'image/webp' });

    await uploadCafeCoverApi('access-token', 'cafe-id', file);

    expect(mocks.uploadToSignedUrl).toHaveBeenCalledWith(
      'cafe-id/image.webp',
      'upload-token',
      file,
      { contentType: 'image/webp' }
    );
    expect(fetchMock.mock.calls[1][0]).toContain('/api/cafes/management/cafe-id/cover-image');
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
  });
});
