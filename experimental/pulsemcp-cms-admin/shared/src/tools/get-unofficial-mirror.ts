import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the unofficial mirror to retrieve',
} as const;

const GetUnofficialMirrorSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function getUnofficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_unofficial_mirror',
    description: `Retrieve a single unofficial mirror by its ID. Returns detailed information including the full JSON data.

Example response:
{
  "id": 123,
  "name": "@modelcontextprotocol/server-filesystem",
  "version": "1.0.0",
  "jsonb_data": { "tools": [...], "resources": [...] },
  "mcp_server_id": 456,
  "mcp_server_slug": "filesystem"
}

Use cases:
- Get detailed information about a specific unofficial mirror
- Review the JSON data before linking to an MCP server
- Check the current state of an unofficial mirror before updating`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetUnofficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        const mirror = await client.getUnofficialMirror(validatedArgs.id);

        let content = `**Unofficial Mirror Details**\n\n`;
        content += `**ID:** ${mirror.id}\n`;
        content += `**Name:** ${mirror.name}\n`;
        content += `**Version:** ${mirror.version}\n`;

        if (mirror.mcp_server_slug) {
          content += `**Linked Server:** ${mirror.mcp_server_slug} (ID: ${mirror.mcp_server_id})\n`;
        }

        if (mirror.previous_name) {
          content += `**Previous Name:** ${mirror.previous_name}\n`;
        }
        if (mirror.next_name) {
          content += `**Next Name:** ${mirror.next_name}\n`;
        }

        if (mirror.proctor_results_count !== undefined) {
          content += `**Proctor Results:** ${mirror.proctor_results_count}\n`;
        }
        if (mirror.mcp_jsons_count !== undefined) {
          content += `**MCP JSONs:** ${mirror.mcp_jsons_count}\n`;
        }

        if (mirror.datetime_ingested) {
          content += `**Ingested:** ${mirror.datetime_ingested}\n`;
        }
        if (mirror.created_at) {
          content += `**Created:** ${mirror.created_at}\n`;
        }
        if (mirror.updated_at) {
          content += `**Updated:** ${mirror.updated_at}\n`;
        }

        content += `\n**JSON Data:**\n\`\`\`json\n${JSON.stringify(mirror.jsonb_data, null, 2)}\n\`\`\``;

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching unofficial mirror: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
