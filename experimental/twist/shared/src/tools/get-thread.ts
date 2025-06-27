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

        // Combine thread content (first message) with comments
        const allMessages = [];
        
        // Add thread content as the first message if it exists
        if (thread.content) {
          allMessages.push({
            id: `thread-${thread.id}`,
            thread_id: thread.id,
            content: thread.content,
            creator: thread.creator,
            creator_name: thread.creator_name,
            posted_ts: thread.posted_ts,
            actions: thread.actions,
            attachments: thread.attachments,
            reactions: thread.reactions,
            system_message: null,
          });
        }
        
        // Add all comment messages
        if (thread.messages && thread.messages.length > 0) {
          allMessages.push(...thread.messages);
        }

        let response = `Thread: "${thread.title}"
ID: ${thread.id}
Channel ID: ${thread.channel_id}
Created: ${thread.posted_ts ? new Date(thread.posted_ts * 1000).toLocaleString() : 'Unknown'}
Status: ${thread.archived ? 'Archived' : 'Active'}

Messages (${allMessages.length} total):
`;

        if (allMessages.length > 0) {
          // Sort all messages by posted time
          const sortedMessages = allMessages.sort(
            (a, b) => (a.posted_ts || 0) - (b.posted_ts || 0)
          );

          // Apply offset and limit for pagination
          // Note: offset is from the end, so we reverse, slice, then reverse back
          const totalMessages = sortedMessages.length;
          const startIndex = Math.max(0, totalMessages - message_offset - message_limit);
          const endIndex = totalMessages - message_offset;
          const paginatedMessages = sortedMessages.slice(startIndex, endIndex);

          const messageList = paginatedMessages
            .map((msg) => {
              // Use posted_ts for timestamp
              const timestamp = msg.posted_ts
                ? new Date(msg.posted_ts * 1000).toLocaleString()
                : 'Unknown time';

              // Use creator_name if available, fall back to creator ID
              const author = msg.creator_name || msg.creator || 'Unknown';

              let messageText = `\n[${timestamp}] ${author}:\n${msg.content}`;

              // Add action buttons if present
              if (msg.actions && msg.actions.length > 0) {
                messageText += '\n\nAction buttons:';
                msg.actions.forEach((action) => {
                  messageText += `\n  • ${action.button_text} (${action.action})`;
                  if (action.url) {
                    messageText += ` - URL: ${action.url}`;
                  }
                  if (action.message) {
                    messageText += ` - Message: "${action.message}"`;
                  }
                });
              }

              // Add attachments if present
              if (msg.attachments && msg.attachments.length > 0) {
                messageText += '\n\nAttachments:';
                msg.attachments.forEach((attachment) => {
                  // For website attachments
                  if (attachment.url_type === 'website' || attachment.url_type === 'object') {
                    messageText += `\n  • ${attachment.title || 'Untitled'} - ${attachment.url}`;
                    if (attachment.site_name) {
                      messageText += `\n    Site: ${attachment.site_name}`;
                    }
                    if (attachment.description) {
                      messageText += `\n    Description: ${attachment.description}`;
                    }
                  } else {
                    // For file attachments
                    const fileName = attachment.file_name || attachment.title || 'Unnamed file';
                    messageText += `\n  • ${fileName}`;
                    if (attachment.underlying_type) {
                      messageText += ` (${attachment.underlying_type})`;
                    }
                    if (attachment.file_size) {
                      messageText += `\n    Size: ${attachment.file_size} bytes`;
                    }
                  }
                  if (attachment.image) {
                    messageText += `\n    Image: ${attachment.image_width}x${attachment.image_height}`;
                  }
                  if (attachment.duration) {
                    messageText += `\n    Duration: ${attachment.duration}`;
                  }
                });
              }

              // Add reactions if present
              if (msg.reactions && Object.keys(msg.reactions).length > 0) {
                messageText += '\n\nReactions:';
                Object.entries(msg.reactions).forEach(([emoji, userIds]) => {
                  messageText += `\n  • ${emoji}: ${userIds.length} ${userIds.length === 1 ? 'user' : 'users'}`;
                });
              }

              // Add system message if present
              if (msg.system_message) {
                const sm = msg.system_message;
                messageText += '\n\nSystem message:';
                messageText += `\n  Type: ${sm.type}`;
                messageText += `\n  Initiator: ${sm.initiator_name} (ID: ${sm.initiator})`;
                if (sm.user_name) {
                  messageText += `\n  User: ${sm.user_name} (ID: ${sm.user_id})`;
                }
                if (sm.channel_name) {
                  messageText += `\n  Channel: ${sm.channel_name}`;
                }
                if (sm.old_title && sm.new_title) {
                  messageText += `\n  Title changed from "${sm.old_title}" to "${sm.new_title}"`;
                } else if (sm.title) {
                  messageText += `\n  Title: ${sm.title}`;
                }
                if (sm.integration_name) {
                  messageText += `\n  Integration: ${sm.integration_name}`;
                }
              }

              return messageText;
            })
            .join('\n---');

          const paginationInfo =
            totalMessages > paginatedMessages.length
              ? ` (showing ${paginatedMessages.length} of ${totalMessages} messages)`
              : '';

          response = response.replace(
            `Messages (${allMessages.length} total):`,
            `Messages (${allMessages.length} total)${paginationInfo}:`
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
