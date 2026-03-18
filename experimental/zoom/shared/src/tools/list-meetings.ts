import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IZoomClient } from '../server.js';

const PARAM_DESCRIPTIONS = {
  type: 'Meeting type filter. Options: "scheduled" (default), "live" (in progress), "upcoming", "upcoming_meetings", "previous_meetings"',
  page_size:
    'Number of meetings to return per page (1-300, default: 30). Use smaller values for faster responses.',
} as const;

export const ListMeetingsSchema = z.object({
  type: z
    .enum(['scheduled', 'live', 'upcoming', 'upcoming_meetings', 'previous_meetings'])
    .default('scheduled')
    .describe(PARAM_DESCRIPTIONS.type),
  page_size: z.number().min(1).max(300).default(30).describe(PARAM_DESCRIPTIONS.page_size),
});

const TOOL_DESCRIPTION = `List Zoom meetings for the authenticated user.

Returns a list of meetings with their IDs, topics, start times, and durations. Use the type parameter to filter by meeting status.

**Returns:** Formatted list of meetings with topic, ID, start time, duration, and join URL.

**Use cases:**
- View upcoming scheduled meetings
- Check which meetings are currently live
- Review past meetings for follow-up`;

export function listMeetingsTool(_server: Server, clientFactory: () => IZoomClient) {
  return {
    name: 'list_meetings',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['scheduled', 'live', 'upcoming', 'upcoming_meetings', 'previous_meetings'],
          default: 'scheduled',
          description: PARAM_DESCRIPTIONS.type,
        },
        page_size: {
          type: 'number',
          default: 30,
          description: PARAM_DESCRIPTIONS.page_size,
        },
      },
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListMeetingsSchema.parse(args);
        const client = clientFactory();
        const result = await client.listMeetings({
          type: validatedArgs.type,
          page_size: validatedArgs.page_size,
        });

        if (result.meetings.length === 0) {
          return {
            content: [{ type: 'text', text: 'No meetings found.' }],
          };
        }

        const lines = [`Found ${result.total_records} meetings:\n`];
        for (const meeting of result.meetings) {
          lines.push(`- **${meeting.topic}** (ID: ${meeting.id})`);
          lines.push(`  Start: ${meeting.start_time || 'Not scheduled'}`);
          lines.push(`  Duration: ${meeting.duration} minutes`);
          lines.push(`  Join: ${meeting.join_url}`);
          lines.push('');
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing meetings: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
