import { vi } from 'vitest';
import type { IGCSClient } from '../../shared/src/gcs-client/gcs-client.js';
import type { GCSConfig, UploadResult, UploadOptions } from '../../shared/src/types.js';

/**
 * Functional mock for unit testing with Vitest spy capabilities
 */
export function createFunctionalMockGCSClient(): IGCSClient & {
  upload: ReturnType<typeof vi.fn>;
  uploadFile: ReturnType<typeof vi.fn>;
  getConfig: ReturnType<typeof vi.fn>;
} {
  const mockConfig: GCSConfig = {
    bucket: 'test-bucket',
    basePath: 'test-uploads/',
    makePublic: true,
  };

  const mockUploadResult: UploadResult = {
    url: 'https://storage.googleapis.com/test-bucket/test-uploads/test-file.png',
    bucket: 'test-bucket',
    path: 'test-uploads/test-file.png',
    size: 1234,
    contentType: 'image/png',
  };

  return {
    upload: vi.fn().mockImplementation(async (_data: Buffer | string, options?: UploadOptions) => {
      const filename = options?.filename || 'test-file.png';
      return {
        ...mockUploadResult,
        path: `test-uploads/${filename}`,
        url: `https://storage.googleapis.com/test-bucket/test-uploads/${filename}`,
        contentType: options?.contentType || 'image/png',
      };
    }),

    uploadFile: vi.fn().mockImplementation(async (filePath: string, options?: UploadOptions) => {
      const path = await import('path');
      const filename = options?.filename || path.basename(filePath);
      return {
        ...mockUploadResult,
        path: `test-uploads/${filename}`,
        url: `https://storage.googleapis.com/test-bucket/test-uploads/${filename}`,
        contentType: options?.contentType || 'image/png',
      };
    }),

    getConfig: vi.fn().mockReturnValue(mockConfig),
  };
}
