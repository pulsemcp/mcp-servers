import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the unofficial mirror to retrieve',
  name: 'The name of the unofficial mirror (e.g., "@modelcontextprotocol/server-filesystem"). If multiple mirrors match, returns the first one.',
} as const;

const GetUnofficialMirrorSchema = z
  .object({
    id: z.number().optional().describe(PARAM_DESCRIPTIONS.id),
    name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'Either id or name must be provided',
  });

export function getUnofficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_unofficial_mirror',
    description: `Retrieve a single unofficial mirror by its ID or name. Returns detailed information including the full JSON data.

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
- Get detailed information about a specific unofficial mirror by ID or name
- Review the JSON data before linking to an MCP server
- Check the current state of an unofficial mirror before updating

Note: Either id or name must be provided.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetUnofficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        let mirror;
        if (validatedArgs.id !== undefined) {
          mirror = await client.getUnofficialMirror(validatedArgs.id);
        } else if (validatedArgs.name) {
          // Search by name and get the first result
          const response = await client.getUnofficialMirrors({ q: validatedArgs.name, limit: 1 });
          if (response.mirrors.length === 0) {
            throw new Error(
              `No unofficial mirror found with name matching "${validatedArgs.name}"`
            );
          }
          // Get full details for the first match
          mirror = await client.getUnofficialMirror(response.mirrors[0].id);
        } else {
          throw new Error('Either id or name must be provided');
        }

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
