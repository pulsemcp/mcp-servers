import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the MCP JSON to update',
  mcp_servers_unofficial_mirror_id: 'Updated unofficial mirror ID',
  title: 'Updated title',
  value: 'Updated configuration value',
  description: 'Updated description',
} as const;

const UpdateMcpJsonSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
  mcp_servers_unofficial_mirror_id: z
    .number()
    .optional()
    .describe(PARAM_DESCRIPTIONS.mcp_servers_unofficial_mirror_id),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  value: z
    .union([z.record(z.unknown()), z.string()])
    .optional()
    .describe(PARAM_DESCRIPTIONS.value),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
});

export function updateMcpJson(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_mcp_json',
    description: `Update an existing MCP JSON configuration by its ID. Only provided fields will be updated.

Example request:
{
  "id": 123,
  "title": "Updated Configuration",
  "value": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user"]
  }
}

Use cases:
- Update the configuration value
- Change the title or description
- Move a configuration to a different unofficial mirror`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
        mcp_servers_unofficial_mirror_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.mcp_servers_unofficial_mirror_id,
        },
        title: { type: 'string', description: PARAM_DESCRIPTIONS.title },
        value: {
          oneOf: [{ type: 'object' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.value,
        },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UpdateMcpJsonSchema.parse(args);
      const client = clientFactory();

      try {
        const { id, value, ...rest } = validatedArgs;

        const params = {
          ...rest,
          ...(value !== undefined
            ? { value: typeof value === 'string' ? JSON.parse(value) : value }
            : {}),
        };

        if (Object.keys(params).length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No changes provided. Please specify at least one field to update.',
              },
            ],
          };
        }

        const mcpJson = await client.updateMcpJson(id, params);

        let content = `Successfully updated MCP JSON!\n\n`;
        content += `**ID:** ${mcpJson.id}\n`;
        content += `**Title:** ${mcpJson.title}\n`;
        content += `**Mirror ID:** ${mcpJson.mcp_servers_unofficial_mirror_id}\n`;
        if (mcpJson.unofficial_mirror_name) {
          content += `**Mirror Name:** ${mcpJson.unofficial_mirror_name}\n`;
        }
        if (mcpJson.description) {
          content += `**Description:** ${mcpJson.description}\n`;
        }
        if (mcpJson.updated_at) {
          content += `**Updated:** ${mcpJson.updated_at}\n`;
        }

        content += `\n**Fields updated:**\n`;
        Object.keys(params).forEach((field) => {
          content += `- ${field}\n`;
        });

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating MCP JSON: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
