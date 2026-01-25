import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { logError } from '../logging.js';

export const UpdateEventSchema = z.object({
  event_id: z.string().min(1).describe('The ID of the event to update.'),
  calendar_id: z
    .string()
    .optional()
    .default('primary')
    .describe('Calendar ID containing the event. Defaults to "primary".'),
  summary: z.string().optional().describe('New event title/summary.'),
  description: z.string().optional().describe('New event description.'),
  location: z.string().optional().describe('New event location.'),
  start_datetime: z
    .string()
    .optional()
    .describe(
      'New start date-time in RFC3339 format (e.g., "2024-01-01T10:00:00-05:00"). Use this for timed events.'
    ),
  start_date: z
    .string()
    .optional()
    .describe(
      'New start date for all-day events (e.g., "2024-01-01"). Use this for all-day events.'
    ),
  start_timezone: z
    .string()
    .optional()
    .describe('Time zone for start time (e.g., "America/New_York"). Optional.'),
  end_datetime: z
    .string()
    .optional()
    .describe(
      'New end date-time in RFC3339 format (e.g., "2024-01-01T11:00:00-05:00"). Use this for timed events.'
    ),
  end_date: z
    .string()
    .optional()
    .describe('New end date for all-day events (e.g., "2024-01-02"). Use this for all-day events.'),
  end_timezone: z
    .string()
    .optional()
    .describe('Time zone for end time (e.g., "America/New_York"). Optional.'),
  attendees: z.array(z.string()).optional().describe('New list of attendee email addresses.'),
  send_updates: z
    .enum(['all', 'externalOnly', 'none'])
    .optional()
    .describe(
      'Whether to send update notifications. "all" sends to all attendees, "externalOnly" to external attendees only, "none" sends no notifications.'
    ),
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
        'For Google Drive files, use the Drive file URL format. ' +
        'Setting this replaces all existing attachments.'
    ),
});

export function updateEventTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_calendar_event',
    description:
      'Updates an existing event in Google Calendar. ' +
      'Only the fields provided will be updated (PATCH semantics). ' +
      'Can update title, description, location, time, and attendees. ' +
      'Returns the updated event details.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: UpdateEventSchema.shape.event_id.description,
        },
        calendar_id: {
          type: 'string',
          description: UpdateEventSchema.shape.calendar_id.description,
        },
        summary: {
          type: 'string',
          description: UpdateEventSchema.shape.summary.description,
        },
        description: {
          type: 'string',
          description: UpdateEventSchema.shape.description.description,
        },
        location: {
          type: 'string',
          description: UpdateEventSchema.shape.location.description,
        },
        start_datetime: {
          type: 'string',
          description: UpdateEventSchema.shape.start_datetime.description,
        },
        start_date: {
          type: 'string',
          description: UpdateEventSchema.shape.start_date.description,
        },
        start_timezone: {
          type: 'string',
          description: UpdateEventSchema.shape.start_timezone.description,
        },
        end_datetime: {
          type: 'string',
          description: UpdateEventSchema.shape.end_datetime.description,
        },
        end_date: {
          type: 'string',
          description: UpdateEventSchema.shape.end_date.description,
        },
        end_timezone: {
          type: 'string',
          description: UpdateEventSchema.shape.end_timezone.description,
        },
        attendees: {
          type: 'array',
          items: { type: 'string' },
          description: UpdateEventSchema.shape.attendees.description,
        },
        send_updates: {
          type: 'string',
          enum: ['all', 'externalOnly', 'none'],
          description: UpdateEventSchema.shape.send_updates.description,
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
          description: UpdateEventSchema.shape.attachments.description,
        },
      },
      required: ['event_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = UpdateEventSchema.parse(args);
        const client = clientFactory();

        // Build event update object with only provided fields
        const eventUpdate: {
          summary?: string;
          description?: string;
          location?: string;
          start?: { dateTime?: string; date?: string; timeZone?: string };
          end?: { dateTime?: string; date?: string; timeZone?: string };
          attendees?: Array<{ email: string }>;
          attachments?: Array<{ fileUrl: string; title?: string }>;
        } = {};

        if (parsed.summary !== undefined) {
          eventUpdate.summary = parsed.summary;
        }
        if (parsed.description !== undefined) {
          eventUpdate.description = parsed.description;
        }
        if (parsed.location !== undefined) {
          eventUpdate.location = parsed.location;
        }

        // Set start time if provided
        if (parsed.start_datetime || parsed.start_date) {
          eventUpdate.start = {};
          if (parsed.start_datetime) {
            eventUpdate.start.dateTime = parsed.start_datetime;
            if (parsed.start_timezone) {
              eventUpdate.start.timeZone = parsed.start_timezone;
            }
          } else if (parsed.start_date) {
            eventUpdate.start.date = parsed.start_date;
          }
        }

        // Set end time if provided
        if (parsed.end_datetime || parsed.end_date) {
          eventUpdate.end = {};
          if (parsed.end_datetime) {
            eventUpdate.end.dateTime = parsed.end_datetime;
            if (parsed.end_timezone) {
              eventUpdate.end.timeZone = parsed.end_timezone;
            }
          } else if (parsed.end_date) {
            eventUpdate.end.date = parsed.end_date;
          }
        }

        // Set attendees if provided
        if (parsed.attendees !== undefined) {
          eventUpdate.attendees = parsed.attendees.map((email) => ({ email }));
        }

        // Set attachments if provided
        if (parsed.attachments !== undefined) {
          eventUpdate.attachments = parsed.attachments.map((attachment) => ({
            fileUrl: attachment.file_url,
            title: attachment.title,
          }));
        }

        // Build options object
        const hasAttachments = parsed.attachments !== undefined;
        const options: {
          sendUpdates?: 'all' | 'externalOnly' | 'none';
          supportsAttachments?: boolean;
        } = {};
        if (parsed.send_updates) {
          options.sendUpdates = parsed.send_updates;
        }
        if (hasAttachments) {
          options.supportsAttachments = true;
        }

        const result = await client.updateEvent(
          parsed.calendar_id,
          parsed.event_id,
          eventUpdate,
          Object.keys(options).length > 0 ? options : undefined
        );

        let output = `# Event Updated Successfully\n\n`;
        output += `## ${result.summary || '(No title)'}\n\n`;
        output += `**Event ID:** ${result.id}\n`;

        // Start time
        if (result.start?.dateTime) {
          output += `**Start:** ${new Date(result.start.dateTime).toLocaleString()}`;
          if (result.start.timeZone) {
            output += ` (${result.start.timeZone})`;
          }
          output += '\n';
        } else if (result.start?.date) {
          output += `**Start:** ${result.start.date} (All day)\n`;
        }

        // End time
        if (result.end?.dateTime) {
          output += `**End:** ${new Date(result.end.dateTime).toLocaleString()}`;
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
        logError('update-event-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error updating event: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
