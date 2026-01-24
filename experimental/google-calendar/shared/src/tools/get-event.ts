import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { logError } from '../logging.js';

export const GetEventSchema = z.object({
  calendar_id: z
    .string()
    .optional()
    .default('primary')
    .describe('Calendar ID containing the event. Defaults to "primary".'),
  event_id: z.string().min(1).describe('The ID of the event to retrieve.'),
});

export function getEventTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_calendar_event',
    description:
      'Retrieves detailed information about a specific calendar event by ID. ' +
      'Returns full event details including title, time, location, attendees, description, recurrence rules, and reminders. ' +
      'Use this when you need complete information about a particular event.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        calendar_id: {
          type: 'string',
          description: GetEventSchema.shape.calendar_id.description,
        },
        event_id: {
          type: 'string',
          description: GetEventSchema.shape.event_id.description,
        },
      },
      required: ['event_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetEventSchema.parse(args);
        const client = clientFactory();

        const event = await client.getEvent(parsed.calendar_id, parsed.event_id);

        let output = `# Event Details\n\n`;
        output += `## ${event.summary || '(No title)'}\n\n`;
        output += `**Event ID:** ${event.id}\n`;

        // Status
        if (event.status) {
          output += `**Status:** ${event.status}\n`;
        }

        // Start time
        if (event.start?.dateTime) {
          output += `**Start:** ${new Date(event.start.dateTime).toLocaleString()}`;
          if (event.start.timeZone) {
            output += ` (${event.start.timeZone})`;
          }
          output += '\n';
        } else if (event.start?.date) {
          output += `**Start:** ${event.start.date} (All day)\n`;
        }

        // End time
        if (event.end?.dateTime) {
          output += `**End:** ${new Date(event.end.dateTime).toLocaleString()}`;
          if (event.end.timeZone) {
            output += ` (${event.end.timeZone})`;
          }
          output += '\n';
        } else if (event.end?.date) {
          output += `**End:** ${event.end.date} (All day)\n`;
        }

        // Location
        if (event.location) {
          output += `**Location:** ${event.location}\n`;
        }

        // Creator
        if (event.creator) {
          output += `**Created By:** ${event.creator.displayName || event.creator.email}\n`;
        }

        // Organizer
        if (event.organizer) {
          output += `**Organizer:** ${event.organizer.displayName || event.organizer.email}\n`;
        }

        // Attendees
        if (event.attendees && event.attendees.length > 0) {
          output += `\n### Attendees (${event.attendees.length})\n\n`;
          for (const attendee of event.attendees) {
            const name = attendee.displayName || attendee.email;
            const status = attendee.responseStatus || 'needsAction';
            const optional = attendee.organizer ? ' [Organizer]' : '';
            output += `- ${name} - **${status}**${optional}\n`;
          }
          output += '\n';
        }

        // Description
        if (event.description) {
          output += `### Description\n\n${event.description}\n\n`;
        }

        // Recurrence
        if (event.recurrence && event.recurrence.length > 0) {
          output += `### Recurrence\n\n`;
          for (const rule of event.recurrence) {
            output += `- ${rule}\n`;
          }
          output += '\n';
        }

        // Reminders
        if (event.reminders) {
          output += `### Reminders\n\n`;
          if (event.reminders.useDefault) {
            output += `Using default reminders\n\n`;
          } else if (event.reminders.overrides && event.reminders.overrides.length > 0) {
            for (const reminder of event.reminders.overrides) {
              output += `- ${reminder.method}: ${reminder.minutes} minutes before\n`;
            }
            output += '\n';
          }
        }

        // Visibility and transparency
        if (event.visibility) {
          output += `**Visibility:** ${event.visibility}\n`;
        }
        if (event.transparency) {
          output += `**Show as:** ${event.transparency}\n`;
        }

        // Metadata
        if (event.created) {
          output += `**Created:** ${new Date(event.created).toLocaleString()}\n`;
        }
        if (event.updated) {
          output += `**Updated:** ${new Date(event.updated).toLocaleString()}\n`;
        }

        // Link
        if (event.htmlLink) {
          output += `\n**Event Link:** ${event.htmlLink}\n`;
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
        logError('get-event-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error getting event: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
