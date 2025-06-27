import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for getting details about a specific channel
 */
export function getChannelTool(server: Server, clientFactory: ClientFactory) {
  const GetChannelSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to retrieve'),
  });

  return {
    name: 'get_channel',
    description: 'Get detailed information about a specific channel by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description: 'The ID of the channel to retrieve',
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
