import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { logError } from '../logging.js';

export const QueryFreebusySchema = z.object({
  time_min: z
    .string()
    .describe('Start time for the query in RFC3339 format (e.g., "2024-01-01T00:00:00Z").'),
  time_max: z
    .string()
    .describe('End time for the query in RFC3339 format (e.g., "2024-01-01T23:59:59Z").'),
  calendar_ids: z
    .array(z.string())
    .min(1)
    .describe(
      'List of calendar IDs to check availability for. Use "primary" for the user\'s primary calendar.'
    ),
  timezone: z
    .string()
    .optional()
    .describe('Time zone for the query (e.g., "America/New_York"). Optional.'),
});

export function queryFreebusyTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'query_calendar_freebusy',
    description:
      'Queries free/busy information for one or more calendars within a specified time range. ' +
      'Returns time periods when calendars are busy (have events scheduled). ' +
      'Useful for finding available meeting times, checking if someone is free, or scheduling around existing events.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        time_min: {
          type: 'string',
          description: QueryFreebusySchema.shape.time_min.description,
        },
        time_max: {
          type: 'string',
          description: QueryFreebusySchema.shape.time_max.description,
        },
        calendar_ids: {
          type: 'array',
          items: { type: 'string' },
          description: QueryFreebusySchema.shape.calendar_ids.description,
        },
        timezone: {
          type: 'string',
          description: QueryFreebusySchema.shape.timezone.description,
        },
      },
      required: ['time_min', 'time_max', 'calendar_ids'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = QueryFreebusySchema.parse(args);
        const client = clientFactory();

        const request = {
          timeMin: parsed.time_min,
          timeMax: parsed.time_max,
          items: parsed.calendar_ids.map((id) => ({ id })),
          timeZone: parsed.timezone,
        };

        const result = await client.queryFreebusy(request);

        let output = `# Free/Busy Information\n\n`;
        output += `**Time Range:** ${new Date(result.timeMin).toLocaleString()} to ${new Date(result.timeMax).toLocaleString()}\n`;
        if (parsed.timezone) {
          output += `**Times shown in:** ${parsed.timezone}\n`;
        }
        output += '\n';

        for (const calendarId of parsed.calendar_ids) {
          const calendarInfo = result.calendars[calendarId];

          output += `## Calendar: ${calendarId}\n\n`;

          if (calendarInfo.errors && calendarInfo.errors.length > 0) {
            output += `**Errors:**\n`;
            for (const error of calendarInfo.errors) {
              output += `- ${error.domain}: ${error.reason}\n`;
            }
            output += '\n';
            continue;
          }

          const busyPeriods = calendarInfo.busy || [];

          if (busyPeriods.length === 0) {
            output += `**Status:** Free for the entire time range\n\n`;
          } else {
            output += `**Busy Periods:** ${busyPeriods.length}\n\n`;
            for (const period of busyPeriods) {
              const start = new Date(period.start).toLocaleString();
              const end = new Date(period.end).toLocaleString();
              output += `- ${start} to ${end}\n`;
            }
            output += '\n';
          }

          output += '---\n\n';
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
        logError('query-freebusy-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error querying free/busy: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
