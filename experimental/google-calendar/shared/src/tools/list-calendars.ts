import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { logError } from '../logging.js';

export const ListCalendarsSchema = z.object({
  max_results: z
    .number()
    .positive()
    .max(250)
    .optional()
    .default(50)
    .describe('Maximum number of calendars to return. Defaults to 50, maximum is 250.'),
});

export function listCalendarsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_calendars',
    description:
      'Lists all calendars available to the authenticated user. ' +
      'Returns calendar details including ID, name, description, time zone, and access role. ' +
      'Use this to discover available calendars before querying events, or to see which calendars the user has access to.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        max_results: {
          type: 'number',
          description: ListCalendarsSchema.shape.max_results.description,
        },
      },
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ListCalendarsSchema.parse(args);
        const client = clientFactory();

        const result = await client.listCalendars({
          maxResults: parsed.max_results,
        });

        const calendars = result.items || [];

        if (calendars.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No calendars found.',
              },
            ],
          };
        }

        let output = `# Available Calendars (${calendars.length} found)\n\n`;

        for (const calendar of calendars) {
          output += `## ${calendar.summary}\n\n`;
          output += `**Calendar ID:** ${calendar.id}\n`;

          if (calendar.description) {
            output += `**Description:** ${calendar.description}\n`;
          }

          output += `**Time Zone:** ${calendar.timeZone}\n`;
          output += `**Access Role:** ${calendar.accessRole}\n`;

          if (calendar.primary) {
            output += `**Primary:** Yes\n`;
          }

          if (calendar.selected !== undefined) {
            output += `**Selected:** ${calendar.selected ? 'Yes' : 'No'}\n`;
          }

          if (calendar.backgroundColor) {
            output += `**Background Color:** ${calendar.backgroundColor}\n`;
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
        logError('list-calendars-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error listing calendars: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
