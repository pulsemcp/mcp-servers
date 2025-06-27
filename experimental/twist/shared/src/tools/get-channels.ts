import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for listing all channels in the workspace
 */
export function getChannelsTool(server: Server, clientFactory: ClientFactory) {
  // No input parameters needed for this tool
  const GetChannelsSchema = z.object({});

  return {
    name: 'get_channels',
    description:
      'Get a list of all channels in the Twist workspace. Returns channel names, IDs, and other metadata.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (args: unknown) => {
      // Validate args (even though we expect no parameters)
      GetChannelsSchema.parse(args);

      const client = clientFactory();

      try {
        const channels = await client.getChannels();

        // Format the response in a user-friendly way
        const channelList = channels
          .filter((ch) => !ch.archived) // Only show active channels
          .map(
            (ch) => `- #${ch.name} (ID: ${ch.id})${ch.description ? ` - ${ch.description}` : ''}`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${channels.filter((ch) => !ch.archived).length} active channels:\n\n${channelList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
