import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for closing a thread
 */
export function closeThreadTool(server: Server, clientFactory: ClientFactory) {
  const CloseThreadSchema = z.object({
    thread_id: z.string().describe('The unique identifier of the thread to close (e.g., "789012")'),
    message: z
      .string()
      .optional()
      .describe(
        'Optional closing message to add to the thread. If not provided, defaults to "Thread closed"'
      ),
  });

  return {
    name: 'close_thread',
    description: `Close an existing Twist thread with an optional closing message. This tool marks a thread as closed, preventing further replies while keeping the thread accessible for reference. A closing message is automatically added to indicate the thread has been closed.

Example response:
Successfully closed thread:
- Thread ID: 789012
- Closing message: "Thread closed - Issue resolved"
- Closed at: 6/27/2025, 4:30:00 PM

The thread has been marked as closed.

Use cases:
- Closing resolved support tickets or issues
- Marking completed discussions as closed
- Ending threads that have reached their conclusion
- Archiving threads that are no longer active
- Closing threads after decisions have been made
- Marking threads as complete after action items are done`,
    inputSchema: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description: 'The unique identifier of the thread to close (e.g., "789012")',
        },
        message: {
          type: 'string',
          description:
            'Optional closing message to add to the thread. If not provided, defaults to "Thread closed"',
        },
      },
      required: ['thread_id'],
    },
    handler: async (args: unknown) => {
      const { thread_id, message } = CloseThreadSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.closeThread(thread_id, message);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully closed thread:
- Thread ID: ${thread_id}
- Closing message: "${message || 'Thread closed'}"
- Closed at: ${result.created_ts ? new Date(result.created_ts * 1000).toLocaleString() : 'Just now'}

The thread has been marked as closed.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error closing thread: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
