import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for listing threads in a channel
 */
export function getThreadsTool(server: Server, clientFactory: ClientFactory) {
  const GetThreadsSchema = z.object({
    channel_id: z
      .string()
      .describe(
        'The unique identifier of the channel (e.g., "123456"). Use get_channels to find channel IDs'
      ),
    limit: z
      .number()
      .optional()
      .default(10)
      .describe(
        'Maximum number of threads to return. Useful for pagination (default: 10, max: 100)'
      ),
    offset: z
      .number()
      .optional()
      .default(0)
      .describe(
        'Number of threads to skip for pagination (e.g., offset: 50 to get the next page after first 50)'
      ),
    include_closed: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'Whether to include closed threads in the results (default: false, only shows open threads)'
      ),
    newer_than_ts: z
      .number()
      .optional()
      .describe(
        'Unix timestamp in seconds to filter threads created after this time (e.g., 1704067200 for Jan 1, 2024)'
      ),
  });

  return {
    name: 'get_threads',
    description: `List threads (conversations) within a specific Twist channel. By default, shows only OPEN threads (excludes closed threads). Threads in Twist are topic-focused conversations that keep discussions organized, unlike traditional chat where everything flows in one stream. Each thread has a title and contains a series of messages.

Example response:
Found 8 open threads:

- "Q4 Planning Discussion" (ID: 789012) - Last updated: 6/27/2025, 2:30:00 PM
- "Bug Report: Login Issues" (ID: 789013) - Last updated: 6/27/2025, 10:15:00 AM
- "Team Standup Notes - June 26" (ID: 789014) [CLOSED] - Last updated: 6/26/2025, 4:45:00 PM
- "Feature Request: Dark Mode" (ID: 789015) - Last updated: 6/25/2025, 11:20:00 AM
- "Documentation Updates Needed" (ID: 789016) - Last updated: 6/24/2025, 3:00:00 PM

Use cases:
- Browsing recent open discussions in a channel (default behavior)
- Finding all threads including closed ones (set include_closed: true)
- Getting thread IDs for message operations
- Monitoring active channel discussions
- Paginating through threads with offset and limit
- Filtering for recent threads using timestamp`,
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description:
            'The unique identifier of the channel (e.g., "123456"). Use get_channels to find channel IDs',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of threads to return. Useful for pagination (default: 10, max: 100)',
          default: 10,
        },
        offset: {
          type: 'number',
          description:
            'Number of threads to skip for pagination (e.g., offset: 50 to get the next page after first 50)',
          default: 0,
        },
        include_closed: {
          type: 'boolean',
          description:
            'Whether to include closed threads in the results (default: false, only shows open threads)',
          default: false,
        },
        newer_than_ts: {
          type: 'number',
          description:
            'Unix timestamp in seconds to filter threads created after this time (e.g., 1704067200 for Jan 1, 2024)',
        },
      },
      required: ['channel_id'],
    },
    handler: async (args: unknown) => {
      const { channel_id, limit, offset, include_closed, newer_than_ts } =
        GetThreadsSchema.parse(args);
      const client = clientFactory();

      try {
        // Fetch more threads than requested to account for filtering
        const fetchLimit = include_closed ? limit : Math.min(limit * 3, 200);
        const threads = await client.getThreads(channel_id, {
          limit: fetchLimit,
          newerThanTs: newer_than_ts,
        });

        if (threads.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No threads found in this channel.',
              },
            ],
          };
        }

        // Sort threads by last update time (most recent first)
        const sortedThreads = threads.sort(
          (a, b) => (b.last_updated_ts || 0) - (a.last_updated_ts || 0)
        );

        // Filter out archived threads and optionally closed threads
        let filteredThreads = sortedThreads.filter((thread) => !thread.archived);

        if (!include_closed) {
          // Filter out closed threads - threads with 'closed' property set to true
          filteredThreads = filteredThreads.filter((thread) => {
            // The API returns a 'closed' boolean on thread objects
            const threadWithClosed = thread as Thread & { closed?: boolean };
            return !threadWithClosed.closed;
          });
        }

        // Apply offset and limit for pagination
        const paginatedThreads = filteredThreads.slice(offset, offset + limit);

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

        const statusText = include_closed ? 'threads' : 'open threads';
        const totalCount = filteredThreads.length;
        const showingCount = paginatedThreads.length;
        const paginationInfo =
          totalCount > offset + showingCount
            ? ` (showing ${showingCount > 0 ? offset + 1 : 0}-${offset + showingCount} of ${totalCount})`
            : '';

        return {
          content: [
            {
              type: 'text',
              text:
                showingCount > 0
                  ? `Found ${totalCount} ${statusText}${paginationInfo}:\n\n${threadList}`
                  : `Found ${totalCount} ${statusText}. No threads to display at offset ${offset}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching threads: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
