import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { logError } from '../logging.js';

export const ListEventsSchema = z.object({
  calendar_id: z
    .string()
    .optional()
    .default('primary')
    .describe('Calendar ID to list events from. Defaults to "primary" (user\'s primary calendar).'),
  time_min: z
    .string()
    .optional()
    .describe(
      'Lower bound (inclusive) for event start time in RFC3339 format (e.g., "2024-01-01T00:00:00Z"). Defaults to current time if not specified.'
    ),
  time_max: z
    .string()
    .optional()
    .describe(
      'Upper bound (exclusive) for event start time in RFC3339 format (e.g., "2024-12-31T23:59:59Z").'
    ),
  max_results: z
    .number()
    .positive()
    .max(250)
    .optional()
    .default(10)
    .describe('Maximum number of events to return. Defaults to 10, maximum is 250.'),
  query: z.string().optional().describe('Free text search query to filter events.'),
  single_events: z
    .boolean()
    .optional()
    .default(true)
    .describe(
      'Whether to expand recurring events into instances. Defaults to true to show individual occurrences.'
    ),
  order_by: z
    .enum(['startTime', 'updated'])
    .optional()
    .describe(
      'Order of events. "startTime" orders by start time (requires single_events=true), "updated" orders by last modification time.'
    ),
});

export function listEventsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_calendar_events',
    description:
      'Lists events from a Google Calendar within an optional time range. ' +
      'Returns event details including title, time, location, attendees, and description. ' +
      'Useful for checking upcoming meetings, finding events by search query, or reviewing a specific time period. ' +
      'By default, shows the next 10 events from the primary calendar.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        calendar_id: {
          type: 'string',
          description: ListEventsSchema.shape.calendar_id.description,
        },
        time_min: {
          type: 'string',
          description: ListEventsSchema.shape.time_min.description,
        },
        time_max: {
          type: 'string',
          description: ListEventsSchema.shape.time_max.description,
        },
        max_results: {
          type: 'number',
          description: ListEventsSchema.shape.max_results.description,
        },
        query: {
          type: 'string',
          description: ListEventsSchema.shape.query.description,
        },
        single_events: {
          type: 'boolean',
          description: ListEventsSchema.shape.single_events.description,
        },
        order_by: {
          type: 'string',
          enum: ['startTime', 'updated'],
          description: ListEventsSchema.shape.order_by.description,
        },
      },
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ListEventsSchema.parse(args);
        const client = clientFactory();

        const result = await client.listEvents(parsed.calendar_id, {
          timeMin: parsed.time_min,
          timeMax: parsed.time_max,
          maxResults: parsed.max_results,
          q: parsed.query,
          singleEvents: parsed.single_events,
          orderBy: parsed.order_by,
        });

        const events = result.items || [];

        if (events.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No events found matching the criteria.',
              },
            ],
          };
        }

        let output = `# Calendar Events (${events.length} found)\n\n`;
        output += `**Calendar:** ${result.summary}\n`;
        output += `**Time Zone:** ${result.timeZone}\n\n`;

        for (const event of events) {
          output += `## ${event.summary || '(No title)'}\n\n`;
          output += `**Event ID:** ${event.id}\n`;

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

          // Status
          if (event.status) {
            output += `**Status:** ${event.status}\n`;
          }

          // Organizer
          if (event.organizer) {
            output += `**Organizer:** ${event.organizer.displayName || event.organizer.email}\n`;
          }

          // Attendees
          if (event.attendees && event.attendees.length > 0) {
            output += `**Attendees:** ${event.attendees.length}\n`;
            for (const attendee of event.attendees) {
              const name = attendee.displayName || attendee.email;
              const status = attendee.responseStatus || 'needsAction';
              output += `  - ${name} (${status})\n`;
            }
          }

          // Description
          if (event.description) {
            const truncated =
              event.description.length > 200
                ? event.description.substring(0, 200) + '...'
                : event.description;
            output += `**Description:** ${truncated}\n`;
          }

          // Link
          if (event.htmlLink) {
            output += `**Link:** ${event.htmlLink}\n`;
          }

          output += '\n---\n\n';
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
        logError('list-events-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error listing events: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
