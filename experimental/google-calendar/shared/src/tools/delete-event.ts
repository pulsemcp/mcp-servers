import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { logError } from '../logging.js';

export const DeleteEventSchema = z.object({
  event_id: z.string().min(1).describe('The ID of the event to delete.'),
  calendar_id: z
    .string()
    .optional()
    .default('primary')
    .describe('Calendar ID containing the event. Defaults to "primary".'),
  send_updates: z
    .enum(['all', 'externalOnly', 'none'])
    .optional()
    .describe(
      'Whether to send cancellation notifications. "all" sends to all attendees, "externalOnly" to external attendees only, "none" sends no notifications.'
    ),
});

export function deleteEventTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_calendar_event',
    description:
      'Deletes an event from Google Calendar. ' +
      'This action is permanent and cannot be undone. ' +
      'Optionally sends cancellation notifications to attendees.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: DeleteEventSchema.shape.event_id.description,
        },
        calendar_id: {
          type: 'string',
          description: DeleteEventSchema.shape.calendar_id.description,
        },
        send_updates: {
          type: 'string',
          enum: ['all', 'externalOnly', 'none'],
          description: DeleteEventSchema.shape.send_updates.description,
        },
      },
      required: ['event_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = DeleteEventSchema.parse(args);
        const client = clientFactory();

        await client.deleteEvent(
          parsed.calendar_id,
          parsed.event_id,
          parsed.send_updates ? { sendUpdates: parsed.send_updates } : undefined
        );

        let output = `# Event Deleted Successfully\n\n`;
        output += `**Event ID:** ${parsed.event_id}\n`;
        output += `**Calendar:** ${parsed.calendar_id}\n`;

        if (parsed.send_updates) {
          output += `**Notifications:** ${parsed.send_updates === 'all' ? 'Sent to all attendees' : parsed.send_updates === 'externalOnly' ? 'Sent to external attendees only' : 'No notifications sent'}\n`;
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('delete-event-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting event: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
