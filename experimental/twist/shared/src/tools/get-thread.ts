import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Tool for getting a thread with all its messages
 */
export function getThreadTool(server: Server, clientFactory: ClientFactory) {
  const GetThreadSchema = z.object({
    thread_id: z
      .string()
      .describe(
        'The unique identifier of the thread (e.g., "789012"). Use get_threads to find thread IDs'
      ),
    message_limit: z
      .number()
      .optional()
      .default(10)
      .describe('Maximum number of recent messages to return (default: 10, max: 100)'),
    message_offset: z
      .number()
      .optional()
      .default(0)
      .describe(
        'Number of messages to skip from the end for pagination (e.g., offset: 10 to get older messages)'
      ),
  });

  return {
    name: 'get_thread',
    description: `Retrieve a complete thread conversation including all messages. This tool fetches the full context of a discussion, showing the thread metadata and every message posted in chronological order. Essential for understanding the complete conversation history.

Example response:
Thread: "Bug Report: Login Issues"
ID: 789013
Channel ID: 123457
Created: 6/27/2025, 9:00:00 AM
Status: Active

Messages (3 total):

[6/27/2025, 9:00:00 AM] sarah.chen:
I'm experiencing login issues with the mobile app. After entering credentials, the app hangs on the loading screen. This started happening after the latest update.

---
[6/27/2025, 9:30:00 AM] mike.developer:
Thanks for reporting this. I can reproduce the issue. It seems related to the new authentication flow. Working on a fix now.

---
[6/27/2025, 10:15:00 AM] mike.developer:
Fix has been deployed. Please try logging in again and let me know if the issue persists.

Use cases:
- Reading full conversation history before responding
- Understanding context before adding a new message
- Archiving or documenting important discussions
- Reviewing decision-making processes in threads
- Catching up on missed conversations
- Analyzing communication patterns in threads`,
    inputSchema: {
      type: 'object',
      properties: {
        thread_id: {
          type: 'string',
          description:
            'The unique identifier of the thread (e.g., "789012"). Use get_threads to find thread IDs',
        },
        message_limit: {
          type: 'number',
          description: 'Maximum number of recent messages to return (default: 10, max: 100)',
          default: 10,
        },
        message_offset: {
          type: 'number',
          description:
            'Number of messages to skip from the end for pagination (e.g., offset: 10 to get older messages)',
          default: 0,
        },
      },
      required: ['thread_id'],
    },
    handler: async (args: unknown) => {
      const { thread_id, message_limit, message_offset } = GetThreadSchema.parse(args);
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

          // Apply offset and limit for pagination
          // Note: offset is from the end, so we reverse, slice, then reverse back
          const totalMessages = sortedMessages.length;
          const startIndex = Math.max(0, totalMessages - message_offset - message_limit);
          const endIndex = totalMessages - message_offset;
          const paginatedMessages = sortedMessages.slice(startIndex, endIndex);

          const messageList = paginatedMessages
            .map((msg) => {
              const timestamp = msg.created_ts
                ? new Date(msg.created_ts * 1000).toLocaleString()
                : 'Unknown time';
              // Check if this is a system message
              const msgWithSystem = msg as Message & { system_message?: { type: string } };
              const systemInfo = msgWithSystem.system_message
                ? ` [${msgWithSystem.system_message.type}]`
                : '';
              return `\n[${timestamp}] ${msg.creator || 'Unknown'}${systemInfo}:\n${msg.content}`;
            })
            .join('\n---');

          const paginationInfo =
            totalMessages > paginatedMessages.length
              ? ` (showing ${paginatedMessages.length} of ${totalMessages} messages)`
              : '';

          response = response.replace(
            `Messages (${thread.messages?.length || 0} total):`,
            `Messages (${thread.messages?.length || 0} total)${paginationInfo}:`
          );
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
