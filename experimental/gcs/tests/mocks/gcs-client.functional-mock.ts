import { vi, type Mock } from 'vitest';
import type { IGCSClient } from '../../shared/src/gcs-client/gcs-client.js';

export interface MockGCSClient extends IGCSClient {
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

export function createMockGCSClient(): MockGCSClient {
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
      generation: undefined,
    }),

    deleteObject: vi.fn().mockResolvedValue(undefined),

    createBucket: vi.fn().mockResolvedValue(undefined),

    deleteBucket: vi.fn().mockResolvedValue(undefined),

    headBucket: vi.fn().mockResolvedValue(true),

    copyObject: vi.fn().mockResolvedValue({
      etag: '"copy-etag"',
      generation: undefined,
    }),
  };
}
