import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const ACTION_ENUM = ['mark_read', 'mark_all_read', 'dismiss', 'dismiss_all_read'] as const;

export const ActionNotificationSchema = z.object({
  action: z.enum(ACTION_ENUM),
  id: z.number().optional(),
});

const TOOL_DESCRIPTION = `Manage notifications in the Agent Orchestrator.

**Actions:**
- **mark_read**: Mark a specific notification as read (requires "id")
- **mark_all_read**: Mark all notifications as read
- **dismiss**: Delete a notification (requires "id", must be read first)
- **dismiss_all_read**: Delete all read notifications`;

export function actionNotificationTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'action_notification',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ACTION_ENUM,
          description: 'Action to perform.',
        },
        id: {
          type: 'number',
          description: 'Notification ID. Required for mark_read and dismiss.',
        },
      },
      required: ['action'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = ActionNotificationSchema.parse(args);
        const client = clientFactory();
        const { action, id } = validated;

        let result: string;

        switch (action) {
          case 'mark_read': {
            if (!id) {
              return {
                content: [
                  { type: 'text', text: 'Error: "id" is required for the "mark_read" action.' },
                ],
                isError: true,
              };
            }
            const notification = await client.markNotificationRead(id);
            result = `## Notification Marked Read\n\n- **ID:** ${notification.id}\n- **Type:** ${notification.notification_type}`;
            break;
          }

          case 'mark_all_read': {
            const response = await client.markAllNotificationsRead();
            result = `## All Notifications Marked Read\n\n- **Marked:** ${response.marked_count}\n- **Remaining Pending:** ${response.pending_count}`;
            break;
          }

          case 'dismiss': {
            if (!id) {
              return {
                content: [
                  { type: 'text', text: 'Error: "id" is required for the "dismiss" action.' },
                ],
                isError: true,
              };
            }
            await client.dismissNotification(id);
            result = `## Notification Dismissed\n\nNotification ${id} has been deleted.`;
            break;
          }

          case 'dismiss_all_read': {
            const response = await client.dismissAllReadNotifications();
            result = `## Read Notifications Dismissed\n\n- **Dismissed:** ${response.dismissed_count}\n- **Remaining Pending:** ${response.pending_count}`;
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
              text: `Error managing notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
