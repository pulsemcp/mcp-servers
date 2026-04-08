import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

export const GetNotificationsSchema = z.object({
  id: z.number().optional(),
  badge_only: z.boolean().optional(),
  status: z.enum(['read', 'unread']).optional(),
  page: z.number().min(1).optional(),
  per_page: z.number().min(1).max(100).optional(),
});

const TOOL_DESCRIPTION = `Get notifications from the Agent Orchestrator.

**Modes:**
- **Badge only**: Set badge_only=true to get just the pending notification count
- **Get by ID**: Provide an id to get a specific notification
- **List**: List notifications with optional status filter and pagination

**Use cases:**
- Check how many unread notifications you have
- Review notification details
- Monitor session alerts`;

export function getNotificationsTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'get_notifications',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: { type: 'number', description: 'Get a specific notification by ID.' },
        badge_only: {
          type: 'boolean',
          description: 'If true, returns only the pending notification count. Default: false',
        },
        status: {
          type: 'string',
          enum: ['read', 'unread'],
          description: 'Filter by status when listing.',
        },
        page: { type: 'number', minimum: 1, description: 'Page number. Default: 1' },
        per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: 'Results per page. Default: 25',
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validated = GetNotificationsSchema.parse(args);
        const client = clientFactory();

        if (validated.badge_only) {
          const badge = await client.getNotificationBadge();
          return {
            content: [
              {
                type: 'text',
                text: `## Notification Badge\n\n**Pending notifications:** ${badge.pending_count}`,
              },
            ],
          };
        }

        if (validated.id) {
          const notification = await client.getNotification(validated.id);
          const lines = [
            `## Notification #${notification.id}`,
            '',
            `- **Type:** ${notification.notification_type}`,
            `- **Read:** ${notification.read ? 'Yes' : 'No'}`,
            `- **Session ID:** ${notification.session_id}`,
          ];
          if (notification.session) {
            lines.push(`- **Session Title:** ${notification.session.title}`);
            lines.push(`- **Session Status:** ${notification.session.status}`);
          }
          lines.push(`- **Created:** ${notification.created_at}`);
          return { content: [{ type: 'text', text: lines.join('\n') }] };
        }

        // List notifications
        const response = await client.listNotifications({
          status: validated.status,
          page: validated.page,
          per_page: validated.per_page,
        });

        if (response.notifications.length === 0) {
          return {
            content: [{ type: 'text', text: '## Notifications\n\nNo notifications found.' }],
          };
        }

        const lines = [
          `## Notifications (${response.pagination.total_count} total, page ${response.pagination.page} of ${response.pagination.total_pages})`,
          '',
        ];
        response.notifications.forEach((n) => {
          const readStatus = n.read ? 'read' : 'unread';
          const sessionInfo = n.session ? ` - ${n.session.title} (${n.session.status})` : '';
          lines.push(
            `- **#${n.id}** [${readStatus}] ${n.notification_type}${sessionInfo} (${n.created_at})`
          );
        });

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting notifications: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
