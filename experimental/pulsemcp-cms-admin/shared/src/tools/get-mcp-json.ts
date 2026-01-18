import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the MCP JSON to retrieve',
} as const;

const GetMcpJsonSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function getMcpJson(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_mcp_json',
    description: `Retrieve a single MCP JSON configuration by its ID. Returns the full configuration value.

Example response:
{
  "id": 123,
  "mcp_servers_unofficial_mirror_id": 456,
  "unofficial_mirror_name": "@modelcontextprotocol/server-filesystem",
  "title": "Default Configuration",
  "description": "Standard filesystem server configuration",
  "value": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
  }
}

Use cases:
- Get the full configuration for an MCP JSON
- Review the value object before using or modifying
- Check which unofficial mirror a configuration belongs to`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetMcpJsonSchema.parse(args);
      const client = clientFactory();

      try {
        const mcpJson = await client.getMcpJson(validatedArgs.id);

        let content = `**MCP JSON Details**\n\n`;
        content += `**ID:** ${mcpJson.id}\n`;
        content += `**Title:** ${mcpJson.title}\n`;
        content += `**Mirror ID:** ${mcpJson.mcp_servers_unofficial_mirror_id}\n`;

        if (mcpJson.unofficial_mirror_name) {
          content += `**Mirror Name:** ${mcpJson.unofficial_mirror_name}`;
          if (mcpJson.unofficial_mirror_version) {
            content += ` v${mcpJson.unofficial_mirror_version}`;
          }
          content += '\n';
        }

        if (mcpJson.description) {
          content += `**Description:** ${mcpJson.description}\n`;
        }
        if (mcpJson.server_key) {
          content += `**Server Key:** ${mcpJson.server_key}\n`;
        }

        if (mcpJson.created_at) {
          content += `**Created:** ${mcpJson.created_at}\n`;
        }
        if (mcpJson.updated_at) {
          content += `**Updated:** ${mcpJson.updated_at}\n`;
        }

        content += `\n**Value:**\n\`\`\`json\n${JSON.stringify(mcpJson.value, null, 2)}\n\`\`\``;

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching MCP JSON: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
