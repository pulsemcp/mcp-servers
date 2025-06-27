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
      .default(50)
      .describe(
        'Maximum number of threads to return. Useful for pagination (default: 50, max: 100)'
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
    description: `List all threads (conversations) within a specific Twist channel. Threads in Twist are topic-focused conversations that keep discussions organized, unlike traditional chat where everything flows in one stream. Each thread has a title and contains a series of messages.

Example response:
Found 8 active threads:

- "Q4 Planning Discussion" (ID: 789012) - Last updated: 6/27/2025, 2:30:00 PM
- "Bug Report: Login Issues" (ID: 789013) - Last updated: 6/27/2025, 10:15:00 AM
- "Team Standup Notes - June 26" (ID: 789014) - Last updated: 6/26/2025, 4:45:00 PM
- "Feature Request: Dark Mode" (ID: 789015) - Last updated: 6/25/2025, 11:20:00 AM
- "Documentation Updates Needed" (ID: 789016) - Last updated: 6/24/2025, 3:00:00 PM

Use cases:
- Browsing recent discussions in a channel
- Finding specific threads by title before adding messages
- Getting thread IDs for message operations
- Monitoring channel activity and engagement
- Filtering for recent threads using timestamp
- Implementing thread pagination for large channels`,
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
            'Maximum number of threads to return. Useful for pagination (default: 50, max: 100)',
          default: 50,
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
      const { channel_id, limit, newer_than_ts } = GetThreadsSchema.parse(args);
      const client = clientFactory();

      try {
        const threads = await client.getThreads(channel_id, {
          limit,
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

        const threadList = sortedThreads
          .filter((thread) => !thread.archived)
          .map((thread) => {
            const lastUpdated = thread.last_updated_ts
              ? new Date(thread.last_updated_ts * 1000).toLocaleString()
              : 'Unknown';
            return `- "${thread.title}" (ID: ${thread.id}) - Last updated: ${lastUpdated}`;
          })
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${threads.filter((t) => !t.archived).length} active threads:\n\n${threadList}`,
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
