import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

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
        const result = await client.deleteMcpJson(validatedArgs.id);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted MCP JSON (ID: ${validatedArgs.id}).\n\n${result.message}`,
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
