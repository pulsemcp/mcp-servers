import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for creating a new thread in a channel
 */
export function createThreadTool(server: Server, clientFactory: ClientFactory) {
  const CreateThreadSchema = z.object({
    channel_id: z.string().describe('The ID of the channel to create the thread in'),
    title: z.string().describe('The title of the thread'),
    content: z.string().describe('The initial message content of the thread'),
  });

  return {
    name: 'create_thread',
    description: 'Create a new thread in a channel with a title and initial message content.',
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description: 'The ID of the channel to create the thread in',
        },
        title: {
          type: 'string',
          description: 'The title of the thread',
        },
        content: {
          type: 'string',
          description: 'The initial message content of the thread',
        },
      },
      required: ['channel_id', 'title', 'content'],
    },
    handler: async (args: unknown) => {
      const { channel_id, title, content } = CreateThreadSchema.parse(args);
      const client = clientFactory();

      try {
        const thread = await client.createThread(channel_id, title, content);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully created thread:
- Title: "${thread.title}"
- ID: ${thread.id}
- Channel ID: ${thread.channel_id}
- Created: ${thread.created_ts ? new Date(thread.created_ts * 1000).toLocaleString() : 'Just now'}

The thread has been created with your initial message.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating thread: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
