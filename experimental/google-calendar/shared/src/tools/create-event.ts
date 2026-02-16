import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { logError } from '../logging.js';

export const CreateEventSchema = z.object({
  calendar_id: z
    .string()
    .optional()
    .default('primary')
    .describe('Calendar ID to create the event in. Defaults to "primary".'),
  summary: z.string().min(1).describe('Event title/summary.'),
  description: z.string().optional().describe('Event description.'),
  location: z.string().optional().describe('Event location.'),
  start_datetime: z
    .string()
    .optional()
    .describe(
      'Start date-time in RFC3339 format (e.g., "2024-01-01T10:00:00-05:00"). Use this for timed events.'
    ),
  start_date: z
    .string()
    .optional()
    .describe('Start date for all-day events (e.g., "2024-01-01"). Use this for all-day events.'),
  start_timezone: z
    .string()
    .optional()
    .describe('Time zone for start time (e.g., "America/New_York"). Optional.'),
  end_datetime: z
    .string()
    .optional()
    .describe(
      'End date-time in RFC3339 format (e.g., "2024-01-01T11:00:00-05:00"). Use this for timed events.'
    ),
  end_date: z
    .string()
    .optional()
    .describe('End date for all-day events (e.g., "2024-01-02"). Use this for all-day events.'),
  end_timezone: z
    .string()
    .optional()
    .describe('Time zone for end time (e.g., "America/New_York"). Optional.'),
  attendees: z.array(z.string()).optional().describe('List of attendee email addresses.'),
  attachments: z
    .array(
      z.object({
        file_url: z.string().url().describe('URL link to the attachment. Required.'),
        title: z.string().optional().describe('Title of the attachment.'),
      })
    )
    .max(25, 'Maximum 25 attachments per event')
    .optional()
    .describe(
      'File attachments for the event. Maximum 25 attachments. Each attachment requires a file_url. ' +
        'For Google Drive files, use the Drive file URL format.'
    ),
});

export function createEventTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_calendar_event',
    description:
      'Creates a new event in Google Calendar. ' +
      'Supports both timed events (using start_datetime/end_datetime) and all-day events (using start_date/end_date). ' +
      'Can include title, description, location, and attendees. ' +
      'Returns the created event details including the event ID and link.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        calendar_id: {
          type: 'string',
          description: CreateEventSchema.shape.calendar_id.description,
        },
        summary: {
          type: 'string',
          description: CreateEventSchema.shape.summary.description,
        },
        description: {
          type: 'string',
          description: CreateEventSchema.shape.description.description,
        },
        location: {
          type: 'string',
          description: CreateEventSchema.shape.location.description,
        },
        start_datetime: {
          type: 'string',
          description: CreateEventSchema.shape.start_datetime.description,
        },
        start_date: {
          type: 'string',
          description: CreateEventSchema.shape.start_date.description,
        },
        start_timezone: {
          type: 'string',
          description: CreateEventSchema.shape.start_timezone.description,
        },
        end_datetime: {
          type: 'string',
          description: CreateEventSchema.shape.end_datetime.description,
        },
        end_date: {
          type: 'string',
          description: CreateEventSchema.shape.end_date.description,
        },
        end_timezone: {
          type: 'string',
          description: CreateEventSchema.shape.end_timezone.description,
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: CreateEventSchema.shape.attendees.description,
        },
        attachments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              file_url: { type: 'string', description: 'URL link to the attachment. Required.' },
              title: { type: 'string', description: 'Title of the attachment.' },
            },
            required: ['file_url'],
          },
          description: CreateEventSchema.shape.attachments.description,
        },
      },
      required: ['summary'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = CreateEventSchema.parse(args);
        const client = clientFactory();

        // Validate that we have either datetime or date fields
        if (!parsed.start_datetime && !parsed.start_date) {
          throw new Error('Must provide either start_datetime or start_date');
        }
        if (!parsed.end_datetime && !parsed.end_date) {
          throw new Error('Must provide either end_datetime or end_date');
        }

        // Build event object
        const event: {
          summary: string;
          description?: string;
          location?: string;
          start: { dateTime?: string; date?: string; timeZone?: string };
          end: { dateTime?: string; date?: string; timeZone?: string };
          attendees?: Array<{ email: string }>;
          attachments?: Array<{ fileUrl: string; title?: string }>;
        } = {
          summary: parsed.summary,
          description: parsed.description,
          location: parsed.location,
          start: {},
          end: {},
        };

        // Set start time
        if (parsed.start_datetime) {
          event.start.dateTime = parsed.start_datetime;
          if (parsed.start_timezone) {
            event.start.timeZone = parsed.start_timezone;
          }
        } else if (parsed.start_date) {
          event.start.date = parsed.start_date;
        }

        // Set end time
        if (parsed.end_datetime) {
          event.end.dateTime = parsed.end_datetime;
          if (parsed.end_timezone) {
            event.end.timeZone = parsed.end_timezone;
          }
        } else if (parsed.end_date) {
          event.end.date = parsed.end_date;
        }

        // Add attendees
        if (parsed.attendees && parsed.attendees.length > 0) {
          event.attendees = parsed.attendees.map((email) => ({ email }));
        }

        // Add attachments
        if (parsed.attachments && parsed.attachments.length > 0) {
          event.attachments = parsed.attachments.map((attachment) => ({
            fileUrl: attachment.file_url,
            title: attachment.title,
          }));
        }

        // Determine if we need supportsAttachments parameter
        const hasAttachments = parsed.attachments && parsed.attachments.length > 0;
        const result = await client.createEvent(
          parsed.calendar_id,
          event,
          hasAttachments ? { supportsAttachments: true } : undefined
        );

        let output = `# Event Created Successfully\n\n`;
        output += `## ${result.summary || '(No title)'}\n\n`;
        output += `**Event ID:** ${result.id}\n`;

        // Start time
        if (result.start?.dateTime) {
          const startOptions = result.start.timeZone
            ? { timeZone: result.start.timeZone }
            : undefined;
          output += `**Start:** ${new Date(result.start.dateTime).toLocaleString(undefined, startOptions)}`;
          if (result.start.timeZone) {
            output += ` (${result.start.timeZone})`;
          }
          output += '\n';
        } else if (result.start?.date) {
          output += `**Start:** ${result.start.date} (All day)\n`;
        }

        // End time
        if (result.end?.dateTime) {
          const endOptions = result.end.timeZone ? { timeZone: result.end.timeZone } : undefined;
          output += `**End:** ${new Date(result.end.dateTime).toLocaleString(undefined, endOptions)}`;
          if (result.end.timeZone) {
            output += ` (${result.end.timeZone})`;
          }
          output += '\n';
        } else if (result.end?.date) {
          output += `**End:** ${result.end.date} (All day)\n`;
        }

        // Location
        if (result.location) {
          output += `**Location:** ${result.location}\n`;
        }

        // Attendees
        if (result.attendees && result.attendees.length > 0) {
          output += `**Attendees:** ${result.attendees.length}\n`;
          for (const attendee of result.attendees) {
            output += `  - ${attendee.email}\n`;
          }
        }

        // Attachments
        if (result.attachments && result.attachments.length > 0) {
          output += `**Attachments:** ${result.attachments.length}\n`;
          for (const attachment of result.attachments) {
            output += `  - ${attachment.title || attachment.fileUrl}\n`;
          }
        }

        // Link
        if (result.htmlLink) {
          output += `\n**Event Link:** ${result.htmlLink}\n`;
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
        logError('create-event-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error creating event: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
