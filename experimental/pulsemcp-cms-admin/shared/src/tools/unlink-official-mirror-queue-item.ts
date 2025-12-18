import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the official mirror queue entry to unlink',
} as const;

const UnlinkOfficialMirrorQueueItemSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function unlinkOfficialMirrorQueueItem(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'unlink_official_mirror_queue_item',
    description: `Unlink an official mirror queue entry from its linked MCP server. This is a synchronous operation.

This action:
1. Removes the mcp_server_id from all mirrors in this queue entry
2. Resets the queue entry status to pending (pending_new or pending_update based on history)
3. The previously linked server is not modified

Use cases:
- Correct a mistaken server linkage
- Re-process a queue entry with a different server
- Reset an entry for re-evaluation
- Unlink before linking to a different server

**Note:** After unlinking, the queue entry will return to pending status and can be:
- Approved again with a different server (approve_official_mirror_queue_item)
- Added to the regular queue as a new draft (add_official_mirror_to_regular_queue)
- Rejected (reject_official_mirror_queue_item)`,
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
      const validatedArgs = UnlinkOfficialMirrorQueueItemSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.unlinkOfficialMirrorQueueItem(validatedArgs.id);

        let content = `# Queue Item Unlinked\n\n`;
        content += `**Success:** ${response.success}\n`;
        content += `**Message:** ${response.message}\n\n`;
        content += `## Queue Item\n\n`;
        content += `- **Name:** ${response.queue_item.name}\n`;
        content += `- **ID:** ${response.queue_item.id}\n`;
        content += `- **Status:** ${response.queue_item.status}\n`;

        if (response.queue_item.linked_server_slug) {
          content += `- **Linked Server:** ${response.queue_item.linked_server_slug}\n`;
        } else {
          content += `- **Linked Server:** None (successfully unlinked)\n`;
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
              text: `Error unlinking official mirror queue item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
