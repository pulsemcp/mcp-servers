import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for adding a message to an existing thread
 */
export function addMessageToThreadTool(server: Server, clientFactory: ClientFactory) {
  const AddMessageSchema = z.object({
    thread_id: z.string().describe('The ID of the thread to add the message to'),
    content: z.string().describe('The message content to add'),
  });

  return {
    name: 'add_message_to_thread',
    description: 'Add a new message to an existing thread.',
    inputSchema: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description: 'The ID of the thread to add the message to',
        },
        content: {
          type: 'string',
          description: 'The message content to add',
        },
      },
      required: ['thread_id', 'content'],
    },
    handler: async (args: unknown) => {
      const { thread_id, content } = AddMessageSchema.parse(args);
      const client = clientFactory();

      try {
        const message = await client.addMessageToThread(thread_id, content);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully added message to thread:
- Message ID: ${message.id}
- Thread ID: ${message.thread_id}
- Posted: ${message.created_ts ? new Date(message.created_ts * 1000).toLocaleString() : 'Just now'}

Your message has been posted to the thread.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error adding message: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
