import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the official mirror queue entry to approve',
  mcp_server_slug:
    'The slug of the existing MCP server to link to. Use search_mcp_implementations to find the right server.',
} as const;

const ApproveOfficialMirrorQueueItemSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
  mcp_server_slug: z.string().describe(PARAM_DESCRIPTIONS.mcp_server_slug),
});

export function approveOfficialMirrorQueueItem(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'approve_official_mirror_queue_item',
    description: `Approve an official mirror queue entry and link it to an existing MCP server. This is an async operation that enqueues a background job.

This action:
1. Links the queue entry to the specified MCP server
2. Enqueues a background job to process the approval
3. The job will update the MCP server with data from the official mirror

**Important:** This is an asynchronous operation. The response indicates the job was enqueued, not that the approval is complete. Use get_official_mirror_queue_item to poll for completion.

Use cases:
- Link an official registry submission to an existing PulseMCP server
- Approve submissions that match known servers
- Update existing server data with official registry information

Workflow:
1. Use get_official_mirror_queue_items to find pending entries
2. Use search_mcp_implementations to find the matching MCP server
3. Call this tool with the queue ID and server slug
4. Poll get_official_mirror_queue_item to verify completion`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.id,
        },
        mcp_server_slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.mcp_server_slug,
        },
      },
      required: ['id', 'mcp_server_slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = ApproveOfficialMirrorQueueItemSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.approveOfficialMirrorQueueItem(
          validatedArgs.id,
          validatedArgs.mcp_server_slug
        );

        let content = `# Approval Job Enqueued\n\n`;
        content += `**Success:** ${response.success}\n`;
        content += `**Message:** ${response.message}\n\n`;
        content += `## Queue Item\n\n`;
        content += `- **Name:** ${response.queue_item.name}\n`;
        content += `- **ID:** ${response.queue_item.id}\n`;
        content += `- **Status:** ${response.queue_item.status}\n`;

        if (response.queue_item.linked_server_slug) {
          content += `- **Linked Server:** ${response.queue_item.linked_server_slug}\n`;
        }

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
              text: `Error approving official mirror queue item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
