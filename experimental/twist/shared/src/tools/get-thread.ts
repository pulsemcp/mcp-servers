import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for getting a thread with all its messages
 */
export function getThreadTool(server: Server, clientFactory: ClientFactory) {
  const GetThreadSchema = z.object({
    thread_id: z.string().describe('The ID of the thread to retrieve'),
  });

  return {
    name: 'get_thread',
    description: 'Get detailed information about a specific thread including all its messages.',
    inputSchema: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description: 'The ID of the thread to retrieve',
        },
      },
      required: ['thread_id'],
    },
    handler: async (args: unknown) => {
      const { thread_id } = GetThreadSchema.parse(args);
      const client = clientFactory();

      try {
        const thread = await client.getThread(thread_id);

        let response = `Thread: "${thread.title}"
ID: ${thread.id}
Channel ID: ${thread.channel_id}
Created: ${thread.created_ts ? new Date(thread.created_ts * 1000).toLocaleString() : 'Unknown'}
Status: ${thread.archived ? 'Archived' : 'Active'}

Messages (${thread.messages?.length || 0} total):
`;

        if (thread.messages && thread.messages.length > 0) {
          // Sort messages by creation time
          const sortedMessages = thread.messages.sort(
            (a, b) => (a.created_ts || 0) - (b.created_ts || 0)
          );

          const messageList = sortedMessages
            .map((msg) => {
              const timestamp = msg.created_ts
                ? new Date(msg.created_ts * 1000).toLocaleString()
                : 'Unknown time';
              return `\n[${timestamp}] ${msg.creator || 'Unknown'}:\n${msg.content}`;
            })
            .join('\n---');

          response += messageList;
        } else {
          response += '\nNo messages in this thread yet.';
        }

        return {
          content: [
            {
              type: 'text',
              text: response,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching thread: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
