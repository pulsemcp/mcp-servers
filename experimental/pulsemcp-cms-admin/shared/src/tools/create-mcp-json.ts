import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  mcp_servers_unofficial_mirror_id: 'The ID of the unofficial mirror this MCP JSON belongs to',
  title: 'Title for the MCP JSON configuration (e.g., "Default Configuration")',
  value: 'The JSON configuration value containing command, args, env, etc.',
  description: 'Optional description of the configuration',
} as const;

const CreateMcpJsonSchema = z.object({
  mcp_servers_unofficial_mirror_id: z
    .number()
    .describe(PARAM_DESCRIPTIONS.mcp_servers_unofficial_mirror_id),
  title: z.string().describe(PARAM_DESCRIPTIONS.title),
  value: z.union([z.record(z.unknown()), z.string()]).describe(PARAM_DESCRIPTIONS.value),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
});

export function createMcpJson(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_mcp_json',
    description: `Create a new MCP JSON configuration. MCP JSONs define how MCP servers should be launched.

Example request:
{
  "mcp_servers_unofficial_mirror_id": 456,
  "title": "Default Configuration",
  "description": "Standard configuration for filesystem server",
  "value": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
  }
}

Use cases:
- Create a new configuration template for an unofficial mirror
- Set up different configuration variants for the same server
- Document server launch configurations`,
    inputSchema: {
      type: 'object',
      properties: {
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
      required: ['mcp_servers_unofficial_mirror_id', 'title', 'value'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateMcpJsonSchema.parse(args);
      const client = clientFactory();

      try {
        const mcpJson = await client.createMcpJson({
          mcp_servers_unofficial_mirror_id: validatedArgs.mcp_servers_unofficial_mirror_id,
          title: validatedArgs.title,
          value:
            typeof validatedArgs.value === 'string'
              ? JSON.parse(validatedArgs.value)
              : validatedArgs.value,
          description: validatedArgs.description,
        });

        let content = `Successfully created MCP JSON!\n\n`;
        content += `**ID:** ${mcpJson.id}\n`;
        content += `**Title:** ${mcpJson.title}\n`;
        content += `**Mirror ID:** ${mcpJson.mcp_servers_unofficial_mirror_id}\n`;
        if (mcpJson.unofficial_mirror_name) {
          content += `**Mirror Name:** ${mcpJson.unofficial_mirror_name}\n`;
        }
        if (mcpJson.description) {
          content += `**Description:** ${mcpJson.description}\n`;
        }
        if (mcpJson.created_at) {
          content += `**Created:** ${mcpJson.created_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating MCP JSON: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
