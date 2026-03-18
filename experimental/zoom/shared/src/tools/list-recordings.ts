import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IZoomClient } from '../server.js';

const PARAM_DESCRIPTIONS = {
  from: 'Start date for recording search in YYYY-MM-DD format. Defaults to 30 days ago. Example: "2025-01-01"',
  to: 'End date for recording search in YYYY-MM-DD format. Defaults to today. Example: "2025-01-31"',
  page_size:
    'Number of recordings to return per page (1-300, default: 30). Use smaller values for faster responses.',
} as const;

export const ListRecordingsSchema = z.object({
  from: z.string().optional().describe(PARAM_DESCRIPTIONS.from),
  to: z.string().optional().describe(PARAM_DESCRIPTIONS.to),
  page_size: z.number().min(1).max(300).default(30).describe(PARAM_DESCRIPTIONS.page_size),
});

const TOOL_DESCRIPTION = `List cloud recordings for the authenticated Zoom user.

Returns recordings within a date range, including file types, sizes, and download URLs.

**Returns:** Formatted list of recorded meetings with their recording files.

**Use cases:**
- Find recordings from recent meetings
- Get download URLs for meeting recordings
- Check recording file types (video, audio, transcript)
- Review meeting recordings within a specific date range`;

export function listRecordingsTool(_server: Server, clientFactory: () => IZoomClient) {
  return {
    name: 'list_recordings',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        from: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.from,
        },
        to: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.to,
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
        const validatedArgs = ListRecordingsSchema.parse(args);
        const client = clientFactory();
        const result = await client.listRecordings({
          from: validatedArgs.from,
          to: validatedArgs.to,
          page_size: validatedArgs.page_size,
        });

        if (result.meetings.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No recordings found between ${result.from} and ${result.to}.`,
              },
            ],
          };
        }

        const lines = [`Found ${result.total_records} recorded meetings:\n`];
        for (const meeting of result.meetings) {
          lines.push(`### ${meeting.topic} (ID: ${meeting.id})`);
          lines.push(`- Start: ${meeting.start_time}`);
          lines.push(`- Duration: ${meeting.duration} minutes`);
          lines.push(`- Total Size: ${(meeting.total_size / 1024 / 1024).toFixed(1)} MB`);
          lines.push(`- Files:`);
          for (const file of meeting.recording_files) {
            lines.push(
              `  - ${file.file_type} (${file.recording_type}): ${(file.file_size / 1024 / 1024).toFixed(1)} MB`
            );
          }
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
              text: `Error listing recordings: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
