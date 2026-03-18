import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IZoomClient } from '../server.js';

const PARAM_DESCRIPTIONS = {
  meeting_id: 'The Zoom meeting ID to retrieve details for. Example: "123456789"',
} as const;

export const GetMeetingSchema = z.object({
  meeting_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.meeting_id),
});

const TOOL_DESCRIPTION = `Get details for a specific Zoom meeting by its ID.

Returns comprehensive meeting information including topic, time, duration, and join URL.

**Returns:** Formatted meeting details with all available metadata.

**Use cases:**
- Get details for a specific meeting before joining
- Check meeting configuration and settings
- Retrieve join URL for a meeting`;

export function getMeetingTool(_server: Server, clientFactory: () => IZoomClient) {
  return {
    name: 'get_meeting',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        meeting_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.meeting_id,
        },
      },
      required: ['meeting_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetMeetingSchema.parse(args);
        const client = clientFactory();
        const meeting = await client.getMeeting(validatedArgs.meeting_id);

        const lines = [
          `## ${meeting.topic}`,
          '',
          `- **ID:** ${meeting.id}`,
          `- **UUID:** ${meeting.uuid}`,
          `- **Status:** ${meeting.status}`,
          `- **Start Time:** ${meeting.start_time || 'Not scheduled'}`,
          `- **Duration:** ${meeting.duration} minutes`,
          `- **Timezone:** ${meeting.timezone}`,
          `- **Join URL:** ${meeting.join_url}`,
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting meeting: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
