import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for listing threads in a channel
 */
export function getThreadsTool(server: Server, clientFactory: ClientFactory) {
  const GetThreadsSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to get threads from'),
    limit: z
      .number()
      .optional()
      .default(50)
      .describe('Maximum number of threads to return (default: 50)'),
    newer_than_ts: z
      .number()
      .optional()
      .describe('Only return threads newer than this Unix timestamp'),
  });

  return {
    name: 'get_threads',
    description: 'Get a list of threads in a specific channel with optional filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description: 'The ID of the channel to get threads from',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of threads to return (default: 50)',
          default: 50,
        },
        newer_than_ts: {
          type: 'number',
          description: 'Only return threads newer than this Unix timestamp',
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
