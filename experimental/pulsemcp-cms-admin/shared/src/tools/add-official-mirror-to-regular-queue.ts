import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the official mirror queue entry to add to the regular queue',
} as const;

const AddOfficialMirrorToRegularQueueSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function addOfficialMirrorToRegularQueue(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'add_official_mirror_to_regular_queue',
    description: `Add an official mirror queue entry to the regular MCP implementation queue. This creates a draft MCP implementation from the mirror data. This is an async operation.

This action:
1. Creates a new draft MCP implementation using the mirror's server.json data
2. Enqueues a background job to process the conversion
3. The new implementation will appear in the regular draft queue for further editing

**Requirements:**
- The queue item must be in pending status (pending_new or pending_update)
- The mirror must have valid name data from server.json

**Important:** This is an asynchronous operation. The response indicates the job was enqueued, not that the conversion is complete. Use get_official_mirror_queue_item to poll for completion.

Use cases:
- Convert a new official registry submission to a draft implementation
- Process entries that need manual editing before going live
- Create draft implementations that need additional information
- Handle servers that don't match any existing PulseMCP servers

Workflow:
1. Use get_official_mirror_queue_items to find pending entries
2. Review the entry with get_official_mirror_queue_item
3. Call this tool to convert to a draft implementation
4. Use get_draft_mcp_implementations to find the new draft
5. Edit with save_mcp_implementation as needed`,
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
      const validatedArgs = AddOfficialMirrorToRegularQueueSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.addOfficialMirrorToRegularQueue(validatedArgs.id);

        let content = `# Adding to Regular Queue\n\n`;
        content += `**Success:** ${response.success}\n`;
        content += `**Message:** ${response.message}\n\n`;
        content += `## Queue Item\n\n`;
        content += `- **Name:** ${response.queue_item.name}\n`;
        content += `- **ID:** ${response.queue_item.id}\n`;
        content += `- **Status:** ${response.queue_item.status}\n`;

        content += `\n**Note:** This is an async operation. A draft MCP implementation will be created. Use get_draft_mcp_implementations to find it once processing completes.`;

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
              text: `Error adding official mirror to regular queue: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
