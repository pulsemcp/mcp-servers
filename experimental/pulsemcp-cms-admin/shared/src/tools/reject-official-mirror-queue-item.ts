import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the official mirror queue entry to reject',
} as const;

const RejectOfficialMirrorQueueItemSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function rejectOfficialMirrorQueueItem(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'reject_official_mirror_queue_item',
    description: `Reject an official mirror queue entry. This is an async operation that enqueues a background job.

This action:
1. Marks the queue entry as rejected
2. Enqueues a background job to process the rejection
3. The entry will not be linked to any MCP server

**Important:** This is an asynchronous operation. The response indicates the job was enqueued, not that the rejection is complete. Use get_official_mirror_queue_item to poll for completion.

Use cases:
- Reject submissions that don't meet quality standards
- Reject duplicate entries that shouldn't be processed
- Mark entries that were submitted in error
- Decline servers that don't belong in the registry`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.id,
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = RejectOfficialMirrorQueueItemSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.rejectOfficialMirrorQueueItem(validatedArgs.id);

        let content = `# Rejection Job Enqueued\n\n`;
        content += `**Success:** ${response.success}\n`;
        content += `**Message:** ${response.message}\n\n`;
        content += `## Queue Item\n\n`;
        content += `- **Name:** ${response.queue_item.name}\n`;
        content += `- **ID:** ${response.queue_item.id}\n`;
        content += `- **Status:** ${response.queue_item.status}\n`;

        content += `\n**Note:** This is an async operation. Poll the queue item to check completion status.`;

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error rejecting official mirror queue item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
