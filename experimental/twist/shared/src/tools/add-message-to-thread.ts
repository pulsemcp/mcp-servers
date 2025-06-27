import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for adding a message to an existing thread
 */
export function addMessageToThreadTool(server: Server, clientFactory: ClientFactory) {
  const AddMessageSchema = z.object({
    thread_id: z
      .string()
      .describe(
        'The unique identifier of the thread (e.g., "789012"). Use get_threads to find thread IDs'
      ),
    content: z
      .string()
      .describe(
        'The message text to post. Supports line breaks for formatting. Keep messages focused and relevant to the thread topic'
      ),
  });

  return {
    name: 'add_message_to_thread',
    description: `Post a new message to an existing Twist thread. This tool allows you to contribute to ongoing conversations by adding your response, update, or comment to a thread. Messages are added chronologically and all thread participants are notified based on their notification preferences.

Example response:
Successfully added message to thread:
- Message ID: 345678
- Thread ID: 789012
- Posted: 6/27/2025, 4:15:00 PM

Your message has been posted to the thread.

Use cases:
- Responding to questions or discussions in a thread
- Providing status updates on ongoing issues
- Adding additional context or information
- Sharing decisions or outcomes from discussions
- Following up on action items
- Contributing to asynchronous team conversations`,
    inputSchema: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description:
            'The unique identifier of the thread (e.g., "789012"). Use get_threads to find thread IDs',
        },
        content: {
          type: 'string',
          description:
            'The message text to post. Supports line breaks for formatting. Keep messages focused and relevant to the thread topic',
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
- Posted: ${message.posted_ts ? new Date(message.posted_ts * 1000).toLocaleString() : 'Just now'}

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
