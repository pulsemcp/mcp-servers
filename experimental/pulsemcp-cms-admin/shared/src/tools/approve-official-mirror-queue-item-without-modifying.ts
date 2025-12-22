import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the official mirror queue entry to approve',
} as const;

const ApproveWithoutModifyingSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function approveOfficialMirrorQueueItemWithoutModifying(
  _server: Server,
  clientFactory: ClientFactory
) {
  return {
    name: 'approve_mirror_no_modify',
    description: `Approve an official mirror queue entry without modifying the linked MCP server. This is a synchronous operation.

This action:
1. Marks the queue entry as approved
2. Does NOT update the linked MCP server with mirror data
3. Requires the queue entry to already be linked to a server

Use this when:
- The queue entry shows an update (pending_update) but you want to acknowledge it without applying changes
- The existing server data is correct and doesn't need to be updated
- You want to mark an entry as reviewed without changing server configuration

**Requirements:**
- The queue entry must already be linked to an MCP server
- Server linkage must be consistent (use get_mirror_item to check)

This is useful for server.json updates where you want to acknowledge the update was received but the existing PulseMCP server data should not be modified.`,
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
      const validatedArgs = ApproveWithoutModifyingSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.approveOfficialMirrorQueueItemWithoutModifying(
          validatedArgs.id
        );

        let content = `# Queue Item Approved (Without Modifying Server)\n\n`;
        content += `**Success:** ${response.success}\n`;
        content += `**Message:** ${response.message}\n\n`;
        content += `## Queue Item\n\n`;
        content += `- **Name:** ${response.queue_item.name}\n`;
        content += `- **ID:** ${response.queue_item.id}\n`;
        content += `- **Status:** ${response.queue_item.status}\n`;

        if (response.queue_item.linked_server_slug) {
          content += `- **Linked Server:** ${response.queue_item.linked_server_slug}\n`;
        }

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
