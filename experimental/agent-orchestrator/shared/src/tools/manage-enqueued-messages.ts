import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const ACTION_ENUM = ['list', 'get', 'create', 'update', 'delete', 'reorder', 'interrupt'] as const;

export const ManageEnqueuedMessagesSchema = z.object({
  session_id: z.union([z.string(), z.number()]),
  action: z.enum(ACTION_ENUM),
  message_id: z.number().optional(),
  content: z.string().optional(),
  stop_condition: z.string().optional(),
  position: z.number().min(1).optional(),
  page: z.number().min(1).optional(),
  per_page: z.number().min(1).max(100).optional(),
});

const TOOL_DESCRIPTION = `Manage the enqueued message queue for an agent session.

**Actions:**
- **list**: List all enqueued messages for a session (supports pagination)
- **get**: Get a specific enqueued message by ID
- **create**: Add a new message to the queue (requires "content")
- **update**: Update an existing message (requires "message_id")
- **delete**: Remove a message from the queue (requires "message_id")
- **reorder**: Change a message's position in the queue (requires "message_id" and "position")
- **interrupt**: Pause the session and send this message immediately (requires "message_id")

Enqueued messages are follow-up prompts queued to be sent to the agent in order.`;

export function manageEnqueuedMessagesTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'manage_enqueued_messages',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: 'Session ID (numeric) or slug (string).',
        },
        action: {
          type: 'string',
          enum: ACTION_ENUM,
          description: 'Action to perform on enqueued messages.',
        },
        message_id: {
          type: 'number',
          description: 'Message ID. Required for get, update, delete, reorder, and interrupt.',
        },
        content: {
          type: 'string',
          description: 'Message content. Required for create. Optional for update.',
        },
        stop_condition: {
          type: 'string',
          description: 'Stop condition for this message. Optional for create and update.',
        },
        position: {
          type: 'number',
          minimum: 1,
          description: 'New position in queue. Required for reorder.',
        },
        page: { type: 'number', minimum: 1, description: 'Page number for list. Default: 1' },
        per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Results per page for list. Default: 25',
        },
      },
      required: ['session_id', 'action'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = ManageEnqueuedMessagesSchema.parse(args);
        const client = clientFactory();
        const {
          session_id,
          action,
          message_id,
          content,
          stop_condition,
          position,
          page,
          per_page,
        } = validated;

        let result: string;

        switch (action) {
          case 'list': {
            const response = await client.listEnqueuedMessages(session_id, { page, per_page });
            if (response.enqueued_messages.length === 0) {
              result = '## Enqueued Messages\n\nNo enqueued messages found.';
            } else {
              const lines = [
                `## Enqueued Messages (${response.pagination.total_count} total, page ${response.pagination.page} of ${response.pagination.total_pages})`,
                '',
              ];
              response.enqueued_messages.forEach((msg) => {
                lines.push(`### Position ${msg.position} (ID: ${msg.id})`);
                lines.push(`- **Status:** ${msg.status}`);
                lines.push(
                  `- **Content:** ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`
                );
                if (msg.stop_condition) lines.push(`- **Stop Condition:** ${msg.stop_condition}`);
                lines.push('');
              });
              result = lines.join('\n');
            }
            break;
          }

          case 'get': {
            if (!message_id) {
              return {
                content: [
                  { type: 'text', text: 'Error: "message_id" is required for the "get" action.' },
                ],
                isError: true,
              };
            }
            const msg = await client.getEnqueuedMessage(session_id, message_id);
            result = [
              `## Enqueued Message #${msg.id}`,
              '',
              `- **Session ID:** ${msg.session_id}`,
              `- **Position:** ${msg.position}`,
              `- **Status:** ${msg.status}`,
              `- **Content:** ${msg.content}`,
              msg.stop_condition ? `- **Stop Condition:** ${msg.stop_condition}` : '',
              `- **Created:** ${msg.created_at}`,
            ]
              .filter(Boolean)
              .join('\n');
            break;
          }

          case 'create': {
            if (!content) {
              return {
                content: [
                  { type: 'text', text: 'Error: "content" is required for the "create" action.' },
                ],
                isError: true,
              };
            }
            const msg = await client.createEnqueuedMessage(session_id, {
              content,
              stop_condition: stop_condition || undefined,
            });
            result = [
              '## Message Enqueued',
              '',
              `- **ID:** ${msg.id}`,
              `- **Position:** ${msg.position}`,
              `- **Status:** ${msg.status}`,
              `- **Content:** ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`,
            ].join('\n');
            break;
          }

          case 'update': {
            if (!message_id) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "message_id" is required for the "update" action.',
                  },
                ],
                isError: true,
              };
            }
            const msg = await client.updateEnqueuedMessage(session_id, message_id, {
              content: content || undefined,
              stop_condition: stop_condition || undefined,
            });
            result = [
              '## Message Updated',
              '',
              `- **ID:** ${msg.id}`,
              `- **Position:** ${msg.position}`,
              `- **Content:** ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`,
            ].join('\n');
            break;
          }

          case 'delete': {
            if (!message_id) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "message_id" is required for the "delete" action.',
                  },
                ],
                isError: true,
              };
            }
            await client.deleteEnqueuedMessage(session_id, message_id);
            result = `## Message Deleted\n\nEnqueued message ${message_id} has been removed from the queue.`;
            break;
          }

          case 'reorder': {
            if (!message_id) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "message_id" is required for the "reorder" action.',
                  },
                ],
                isError: true,
              };
            }
            if (!position) {
              return {
                content: [
                  { type: 'text', text: 'Error: "position" is required for the "reorder" action.' },
                ],
                isError: true,
              };
            }
            const msg = await client.reorderEnqueuedMessage(session_id, message_id, position);
            result = [
              '## Message Reordered',
              '',
              `- **ID:** ${msg.id}`,
              `- **New Position:** ${msg.position}`,
            ].join('\n');
            break;
          }

          case 'interrupt': {
            if (!message_id) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "message_id" is required for the "interrupt" action.',
                  },
                ],
                isError: true,
              };
            }
            const response = await client.interruptEnqueuedMessage(session_id, message_id);
            result = [
              '## Message Sent as Interrupt',
              '',
              `- **Session ID:** ${response.session.id}`,
              `- **Session Status:** ${response.session.status}`,
              `- **Message:** ${response.message}`,
            ].join('\n');
            break;
          }

          default: {
            const _exhaustiveCheck: never = action;
            return {
              content: [{ type: 'text', text: `Error: Unknown action "${_exhaustiveCheck}"` }],
              isError: true,
            };
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error managing enqueued messages: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
