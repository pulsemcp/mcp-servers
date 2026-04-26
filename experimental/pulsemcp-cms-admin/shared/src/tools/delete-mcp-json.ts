import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { recacheReminderForMirrorParent } from '../recache-reminder.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the MCP JSON to delete',
} as const;

const DeleteMcpJsonSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function deleteMcpJson(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_mcp_json',
    description: `Delete an MCP JSON configuration by its ID. This action is irreversible.

Use cases:
- Remove obsolete configurations
- Clean up test data
- Remove incorrectly created configurations`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteMcpJsonSchema.parse(args);
      const client = clientFactory();

      try {
        // Capture parent mirror id before deletion so we can emit a recache
        // reminder if the parent server is live. If the lookup fails, fall
        // back to no reminder rather than blocking the delete.
        let mirrorId: number | null | undefined;
        try {
          const mcpJson = await client.getMcpJson(validatedArgs.id);
          mirrorId = mcpJson.mcp_servers_unofficial_mirror_id;
        } catch {
          mirrorId = null;
        }

        const result = await client.deleteMcpJson(validatedArgs.id);

        let text = `Successfully deleted MCP JSON (ID: ${validatedArgs.id}).\n\n${result.message}`;
        text += await recacheReminderForMirrorParent(client, mirrorId);

        return {
          content: [
            {
              type: 'text',
              text,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting MCP JSON: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
