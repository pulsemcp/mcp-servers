import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for creating a new thread in a channel
 */
export function createThreadTool(server: Server, clientFactory: ClientFactory) {
  const CreateThreadSchema = z.object({
    channel_id: z
      .string()
      .describe(
        'The unique identifier of the channel where the thread will be created (e.g., "123456"). Use get_channels to find channel IDs'
      ),
    title: z
      .string()
      .describe(
        'A descriptive title for the thread (e.g., "Q4 Planning Discussion" or "Bug Report: Login Issues"). Keep it concise but informative'
      ),
    content: z
      .string()
      .describe(
        'The first message in the thread. This sets the context for the discussion. Supports basic formatting like line breaks'
      ),
  });

  return {
    name: 'create_thread',
    description: `Create a new thread (conversation) in a Twist channel. Threads are the core organizational unit in Twist, allowing teams to have focused, asynchronous discussions on specific topics. Each thread starts with a title and an initial message that sets the context.

Example response:
Successfully created thread:
- Title: "Q4 Planning Discussion"
- ID: 789017
- Channel ID: 123457
- Created: 6/27/2025, 3:45:00 PM

The thread has been created with your initial message.

Use cases:
- Starting a new discussion on a specific topic
- Creating bug reports or feature requests
- Initiating project planning conversations
- Posting announcements or updates
- Opening threads for meeting notes or agendas
- Beginning async brainstorming sessions`,
    inputSchema: {
      type: 'object',
      properties: {
        channel_id: {
          type: 'string',
          description:
            'The unique identifier of the channel where the thread will be created (e.g., "123456"). Use get_channels to find channel IDs',
        },
        title: {
          type: 'string',
          description:
            'A descriptive title for the thread (e.g., "Q4 Planning Discussion" or "Bug Report: Login Issues"). Keep it concise but informative',
        },
        content: {
          type: 'string',
          description:
            'The first message in the thread. This sets the context for the discussion. Supports basic formatting like line breaks',
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
