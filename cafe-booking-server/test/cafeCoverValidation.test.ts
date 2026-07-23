import { describe, expect, it } from 'vitest';
import { validateCoverUploadRequest } from '../src/controllers/cafeManagementController';

describe('cafe cover validation', () => {
  it('accepts supported images under 5 MB', () => {
    expect(validateCoverUploadRequest({
      file_name: 'workspace.webp',
      content_type: 'image/webp',
      size_bytes: 1024,
    })).toMatchObject({ contentType: 'image/webp', extension: 'webp' });
  });

  it('rejects unsupported file types', () => {
    expect(() => validateCoverUploadRequest({
      file_name: 'workspace.gif',
      content_type: 'image/gif',
      size_bytes: 1024,
    })).toThrow();
  });

  it('rejects files over 5 MB', () => {
    expect(() => validateCoverUploadRequest({
      file_name: 'workspace.png',
      content_type: 'image/png',
      size_bytes: 5 * 1024 * 1024 + 1,
    })).toThrow();
  });
});
