import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory, Thread } from '../server.js';

/**
 * Tool for getting details about a specific channel
 */
export function getChannelTool(server: Server, clientFactory: ClientFactory) {
  const GetChannelSchema = z.object({
    channel_id: z
      .string()
      .describe(
        'The unique identifier of the channel (e.g., "123456"). Use get_channels to find channel IDs'
      ),
    include_threads: z
      .boolean()
      .optional()
      .default(true)
      .describe('Whether to include threads in the channel (default: true)'),
    threads_limit: z
      .number()
      .optional()
      .default(10)
      .describe(
        'Maximum number of threads to return when include_threads is true (default: 10, max: 100)'
      ),
    threads_offset: z
      .number()
      .optional()
      .default(0)
      .describe(
        'Number of threads to skip for pagination when include_threads is true (e.g., offset: 50 to get the next page after first 50)'
      ),
    include_closed_threads: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Whether to include closed threads in the results when include_threads is true (default: false, only shows open threads)'
      ),
    threads_newer_than_ts: z
      .number()
      .optional()
      .describe(
        'Unix timestamp in seconds to filter threads created after this time when include_threads is true (e.g., 1704067200 for Jan 1, 2024)'
      ),
  });

  return {
    name: 'get_channel',
    description: `Retrieve detailed information about a specific Twist channel along with its threads. This tool provides comprehensive metadata about a channel including its name, description, creation date, status, and optionally lists threads within the channel. By default, it includes open threads but this can be disabled or customized.

Example response:
Channel Details:
- Name: #engineering
- ID: 123457
- Description: Engineering team updates and technical discussions
- Workspace ID: 228287
- Status: Active
- Created: 3/15/2024, 10:30:00 AM

Threads (8 open threads):
- "Q4 Planning Discussion" (ID: 789012) - Last updated: 6/27/2025, 2:30:00 PM
- "Bug Report: Login Issues" (ID: 789013) - Last updated: 6/27/2025, 10:15:00 AM
- "Feature Request: Dark Mode" (ID: 789015) - Last updated: 6/25/2025, 11:20:00 AM

Use cases:
- Getting full channel overview including active discussions
- Verifying channel status and content before operations
- Browsing threads without a separate API call
- Getting thread IDs for message operations
- Monitoring channel activity with thread listing
- Paginating through channel threads with offset and limit`,
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description:
            'The unique identifier of the channel (e.g., "123456"). Use get_channels to find channel IDs',
        },
        include_threads: {
          type: 'boolean',
          description: 'Whether to include threads in the channel (default: true)',
          default: true,
        },
        threads_limit: {
          type: 'number',
          description:
            'Maximum number of threads to return when include_threads is true (default: 10, max: 100)',
          default: 10,
        },
        threads_offset: {
          type: 'number',
          description:
            'Number of threads to skip for pagination when include_threads is true (e.g., offset: 50 to get the next page after first 50)',
          default: 0,
        },
        include_closed_threads: {
          type: 'boolean',
          description:
            'Whether to include closed threads in the results when include_threads is true (default: false, only shows open threads)',
          default: false,
        },
        threads_newer_than_ts: {
          type: 'number',
          description:
            'Unix timestamp in seconds to filter threads created after this time when include_threads is true (e.g., 1704067200 for Jan 1, 2024)',
        },
      },
      required: ['channel_id'],
    },
    handler: async (args: unknown) => {
      const {
        channel_id,
        include_threads,
        threads_limit,
        threads_offset,
        include_closed_threads,
        threads_newer_than_ts,
      } = GetChannelSchema.parse(args);
      const client = clientFactory();

      try {
        const channel = await client.getChannel(channel_id);

        let channelInfo = `Channel Details:
- Name: #${channel.name}
- ID: ${channel.id}
- Description: ${channel.description || 'No description'}
- Workspace ID: ${channel.workspace_id}
- Status: ${channel.archived ? 'Archived' : 'Active'}
- Created: ${channel.created_ts ? new Date(channel.created_ts * 1000).toLocaleString() : 'Unknown'}`;

        // Include threads if requested
        if (include_threads) {
          try {
            // Apply default date filter when none provided to ensure we get historical threads
            // Without this, only very recent threads are returned by the API
            let effectiveNewerThanTs = threads_newer_than_ts;
            if (!effectiveNewerThanTs) {
              // Default to threads from the last 90 days if no date filter is provided
              const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
              effectiveNewerThanTs = ninetyDaysAgo;
            }

            // Increase the API limit to account for filtering and pagination
            // Since we filter client-side, we need to fetch more than the final limit
            // to ensure we have enough results after filtering
            const fetchLimit = Math.min(100, Math.max(threads_limit + threads_offset + 50, threads_limit * 3));

            const threads = await client.getThreads(channel_id, {
              limit: fetchLimit,
              newerThanTs: effectiveNewerThanTs,
            });

            if (threads.length === 0) {
              channelInfo += '\n\nNo threads found in this channel.';
            } else {
              // Sort threads by last update time (most recent first)
              const sortedThreads = threads.sort(
                (a, b) => (b.last_updated_ts || 0) - (a.last_updated_ts || 0)
              );

              // Apply offset before filtering to maintain consistent pagination
              // This ensures that offset=10 means "skip the first 10 threads" regardless of filtering
              const offsetThreads = sortedThreads.slice(threads_offset);

              // Filter out archived threads and optionally closed threads
              let filteredThreads = offsetThreads.filter((thread) => !thread.archived);

              if (!include_closed_threads) {
                // Filter out closed threads - threads with 'closed' property set to true
                filteredThreads = filteredThreads.filter((thread) => {
                  // The API returns a 'closed' boolean on thread objects
                  const threadWithClosed = thread as Thread & { closed?: boolean };
                  return !threadWithClosed.closed;
                });
              }

              // Apply limit for pagination (offset already applied before filtering)
              const paginatedThreads = filteredThreads.slice(0, threads_limit);

              const threadList = paginatedThreads
                .map((thread) => {
                  const lastUpdated = thread.last_updated_ts
                    ? new Date(thread.last_updated_ts * 1000).toLocaleString()
                    : 'Unknown';
                  const threadWithClosed = thread as Thread & { closed?: boolean };
                  const closedStatus = threadWithClosed.closed ? ' [CLOSED]' : '';
                  return `- "${thread.title}" (ID: ${thread.id})${closedStatus} - Last updated: ${lastUpdated}`;
                })
                .join('\n');

              // Calculate pagination info with proper total counts
              // Since offset is applied before filtering, we need separate counts for display
              const statusText = include_closed_threads ? 'threads' : 'open threads';
              
              // Count all threads that would pass the filter (for total count display)
              let allFilteredThreads = sortedThreads.filter((thread) => !thread.archived);
              if (!include_closed_threads) {
                allFilteredThreads = allFilteredThreads.filter((thread) => {
                  const threadWithClosed = thread as Thread & { closed?: boolean };
                  return !threadWithClosed.closed;
                });
              }
              const totalFilteredCount = allFilteredThreads.length;
              
              const showingCount = paginatedThreads.length;
              
              // Calculate pagination range more accurately
              const startIndex = threads_offset + 1;
              const endIndex = threads_offset + showingCount;
              const hasMoreResults = threads.length >= fetchLimit; // Might have more data beyond what we fetched
              
              const paginationInfo = threads_offset > 0 || showingCount < totalFilteredCount || hasMoreResults
                ? ` (showing ${showingCount > 0 ? startIndex : 0}-${endIndex}${hasMoreResults ? '+' : ` of ${totalFilteredCount}`})`
                : '';

              channelInfo +=
                showingCount > 0
                  ? `\n\nThreads (${totalFilteredCount}${hasMoreResults ? '+' : ''} ${statusText}${paginationInfo}):\n${threadList}`
                  : `\n\nNo ${statusText} found at offset ${threads_offset}. Try a smaller offset or different date filter.`;
            }
          } catch (threadsError) {
            channelInfo += `\n\nError fetching threads: ${threadsError instanceof Error ? threadsError.message : 'Unknown error'}`;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: channelInfo,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching channel: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
