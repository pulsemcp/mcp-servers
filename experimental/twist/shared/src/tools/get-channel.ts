import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

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
  });

  return {
    name: 'get_channel',
    description: `Retrieve detailed information about a specific Twist channel. This tool provides comprehensive metadata about a channel including its name, description, creation date, and status. Use this when you need more information than what's provided by get_channels.

Example response:
Channel Details:
- Name: #engineering
- ID: 123457
- Description: Engineering team updates and technical discussions
- Workspace ID: 228287
- Status: Active
- Created: 3/15/2024, 10:30:00 AM

Use cases:
- Getting full details about a channel before creating threads in it
- Verifying channel status (active vs archived) before operations
- Retrieving channel descriptions for documentation purposes
- Checking channel creation dates for auditing
- Confirming workspace association for multi-workspace setups`,
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description:
            'The unique identifier of the channel (e.g., "123456"). Use get_channels to find channel IDs',
        },
      },
      required: ['channel_id'],
    },
    handler: async (args: unknown) => {
      const { channel_id } = GetChannelSchema.parse(args);
      const client = clientFactory();

      try {
        const channel = await client.getChannel(channel_id);

        return {
          content: [
            {
              type: 'text',
              text: `Channel Details:
- Name: #${channel.name}
- ID: ${channel.id}
- Description: ${channel.description || 'No description'}
- Workspace ID: ${channel.workspace_id}
- Status: ${channel.archived ? 'Archived' : 'Active'}
- Created: ${channel.created_ts ? new Date(channel.created_ts * 1000).toLocaleString() : 'Unknown'}`,
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
