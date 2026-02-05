import { vi, type Mock } from 'vitest';
import type { IS3Client } from '../../shared/src/s3-client/s3-client.js';

export interface MockS3Client extends IS3Client {
  listBuckets: Mock;
  listObjects: Mock;
  getObject: Mock;
  putObject: Mock;
  deleteObject: Mock;
  createBucket: Mock;
  deleteBucket: Mock;
  headBucket: Mock;
  copyObject: Mock;
}

export function createMockS3Client(): MockS3Client {
  return {
    listBuckets: vi.fn().mockResolvedValue({
      buckets: [{ name: 'test-bucket', creationDate: new Date() }],
    }),

    listObjects: vi.fn().mockResolvedValue({
      objects: [{ key: 'test-key', size: 100, lastModified: new Date() }],
      commonPrefixes: [],
      isTruncated: false,
    }),

    getObject: vi.fn().mockResolvedValue({
      content: 'test content',
      contentType: 'text/plain',
      contentLength: 12,
      lastModified: new Date(),
      etag: '"test-etag"',
      metadata: {},
    }),

    putObject: vi.fn().mockResolvedValue({
      etag: '"new-etag"',
      versionId: undefined,
    }),

    deleteObject: vi.fn().mockResolvedValue(undefined),

    createBucket: vi.fn().mockResolvedValue(undefined),

    deleteBucket: vi.fn().mockResolvedValue(undefined),

    headBucket: vi.fn().mockResolvedValue(true),

    copyObject: vi.fn().mockResolvedValue({
      etag: '"copy-etag"',
      lastModified: new Date(),
    }),
  };
}
