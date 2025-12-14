/**
 * Functional test mock for storage client
 */
import { MockStorageClient } from '../../shared/src/storage-client/mock-client.js';

/**
 * Create a mock storage client for functional testing
 */
export function createMockStorageClient(
  initialFiles?: Record<
    string,
    { content: string; contentType?: string; metadata?: Record<string, string> }
  >
) {
  return new MockStorageClient({ files: initialFiles });
}
