import type { Thread } from '../../server.js';
import { getThreads } from './get-threads.js';

/**
 * Robust thread fetching that handles pagination and filtering client-side.
 * This function abstracts away Twist API limitations and provides a clean interface
 * that always returns the requested number of threads (when possible).
 */
export async function getRobustThreads(
  baseUrl: string,
  headers: Record<string, string>,
  channelId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeClosedThreads?: boolean;
    newerThanTs?: number;
  }
): Promise<{
  threads: Array<Thread>;
  totalCount: number;
  hasMore: boolean;
}> {
  // Apply default date filter when none provided to ensure we get historical threads
  // Without this, only very recent threads are returned by the API
  let effectiveNewerThanTs = options?.newerThanTs;
  if (!effectiveNewerThanTs) {
    // Default to threads from the last 90 days if no date filter is provided
    const ninetyDaysAgo = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    effectiveNewerThanTs = ninetyDaysAgo;
  }

  // Fetch all threads from the API (up to 500 max)
  // We always fetch the maximum to avoid API pagination issues
  const allThreads = await getThreads(baseUrl, headers, channelId, {
    limit: 500, // Twist API maximum
    newerThanTs: effectiveNewerThanTs,
  });

  // Filter out archived threads
  let filteredThreads = allThreads.filter((thread) => !thread.archived);

  // Filter closed threads if requested
  if (!options?.includeClosedThreads) {
    filteredThreads = filteredThreads.filter((thread) => {
      const threadWithClosed = thread as Thread & { closed?: boolean };
      return !threadWithClosed.closed;
    });
  }

  // Sort by last update time (most recent first)
  filteredThreads.sort((a, b) => (b.last_updated_ts || 0) - (a.last_updated_ts || 0));

  const totalCount = filteredThreads.length;
  const offset = options?.offset || 0;
  const limit = options?.limit || totalCount;

  // Apply pagination
  const paginatedThreads = filteredThreads.slice(offset, offset + limit);
  const hasMore = offset + limit < totalCount;

  return {
    threads: paginatedThreads,
    totalCount,
    hasMore,
  };
}