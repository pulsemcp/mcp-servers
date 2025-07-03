import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory, Thread } from '../server.js';

// Parameter descriptions (single source of truth)
const PARAM_DESCRIPTIONS = {
  channel_id:
    'The unique identifier of the channel (e.g., "123456"). Use get_channels to find channel IDs',
  include_threads: 'Whether to include threads in the channel (default: true)',
  threads_limit:
    'Maximum number of threads to return when include_threads is true (default: 10, max: 100)',
  threads_offset:
    'Number of threads to skip for pagination when include_threads is true (e.g., offset: 50 to get the next page after first 50)',
  include_closed_threads:
    'Whether to include closed threads in the results when include_threads is true (default: false, only shows open threads)',
  threads_newer_than_ts:
    'Unix timestamp in seconds to filter threads created after this time when include_threads is true (e.g., 1704067200 for Jan 1, 2024)',
} as const;

/**
 * Tool for getting details about a specific channel
 */
export function getChannelTool(server: Server, clientFactory: ClientFactory) {
  const GetChannelSchema = z.object({
    channel_id: z.string().describe(PARAM_DESCRIPTIONS.channel_id),
    include_threads: z
      .boolean()
      .optional()
      .default(true)
      .describe(PARAM_DESCRIPTIONS.include_threads),
    threads_limit: z.number().optional().default(10).describe(PARAM_DESCRIPTIONS.threads_limit),
    threads_offset: z.number().optional().default(0).describe(PARAM_DESCRIPTIONS.threads_offset),
    include_closed_threads: z
      .boolean()
      .optional()
      .default(false)
      .describe(PARAM_DESCRIPTIONS.include_closed_threads),
    threads_newer_than_ts: z.number().optional().describe(PARAM_DESCRIPTIONS.threads_newer_than_ts),
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
          description: PARAM_DESCRIPTIONS.channel_id,
        },
        include_threads: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_threads,
          default: true,
        },
        threads_limit: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.threads_limit,
          default: 10,
        },
        threads_offset: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.threads_offset,
          default: 0,
        },
        include_closed_threads: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_closed_threads,
          default: false,
        },
        threads_newer_than_ts: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.threads_newer_than_ts,
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
            // Use robust thread fetching that handles all pagination and filtering logic
            // This includes the 90-day default date filter for historical threads
            const result = await client.getRobustThreads(channel_id, {
              limit: threads_limit,
              offset: threads_offset,
              includeClosedThreads: include_closed_threads,
              newerThanTs: threads_newer_than_ts,
            });

            if (result.totalCount === 0) {
              channelInfo += '\n\nNo threads found in this channel.';
            } else {
              const threadList = result.threads
                .map((thread) => {
                  const lastUpdated = thread.last_updated_ts
                    ? new Date(thread.last_updated_ts * 1000).toLocaleString()
                    : 'Unknown';
                  const threadWithClosed = thread as Thread & { closed?: boolean };
                  const closedStatus = threadWithClosed.closed ? ' [CLOSED]' : '';
                  return `- "${thread.title}" (ID: ${thread.id})${closedStatus} - Last updated: ${lastUpdated}`;
                })
                .join('\n');

              const statusText = include_closed_threads ? 'threads' : 'open threads';
              const showingCount = result.threads.length;
              const paginationInfo =
                result.totalCount > showingCount || threads_offset > 0
                  ? ` (showing ${showingCount > 0 ? threads_offset + 1 : 0}-${threads_offset + showingCount} of ${result.totalCount})`
                  : '';

              const moreInfo = result.hasMore ? ' (use offset to see more)' : '';

              channelInfo +=
                showingCount > 0
                  ? `\n\nThreads (${result.totalCount} ${statusText}${paginationInfo}${moreInfo}):\n${threadList}`
                  : `\n\nThreads (${result.totalCount} ${statusText}). No threads to display at offset ${threads_offset}.`;
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
