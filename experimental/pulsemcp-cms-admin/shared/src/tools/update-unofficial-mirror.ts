import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the unofficial mirror to update',
  name: 'Updated name of the unofficial mirror',
  version: 'Updated version of the mirror',
  server_json:
    'Updated server.json content. This will be automatically wrapped in a { "server": ... } envelope as required by the PulseMCP Sub-Registry API.',
  mcp_server_id: 'ID of the MCP server to link (set to null to unlink)',
  previous_name: 'Updated previous name (set to null to clear)',
  next_name: 'Updated next name (set to null to clear)',
} as const;

const UpdateUnofficialMirrorSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
  name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  version: z.string().optional().describe(PARAM_DESCRIPTIONS.version),
  server_json: z
    .union([z.record(z.unknown()), z.string()])
    .optional()
    .describe(PARAM_DESCRIPTIONS.server_json),
  mcp_server_id: z.number().nullable().optional().describe(PARAM_DESCRIPTIONS.mcp_server_id),
  previous_name: z.string().nullable().optional().describe(PARAM_DESCRIPTIONS.previous_name),
  next_name: z.string().nullable().optional().describe(PARAM_DESCRIPTIONS.next_name),
});

export function updateUnofficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_unofficial_mirror',
    description: `Update an existing unofficial mirror by its ID. Only provided fields will be updated.

The server_json parameter accepts server.json content directly and automatically wraps it in a { "server": ... } envelope as required by the PulseMCP Sub-Registry API.

Example request updating server_json:
{
  "id": 123,
  "server_json": {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
    "name": "com.pulsemcp.mirror/example",
    "title": "Example Server",
    "version": "0.0.2"
  }
}

Example request updating other fields:
{
  "id": 123,
  "version": "1.1.0",
  "mcp_server_id": 456
}

Use cases:
- Link an unofficial mirror to an MCP server
- Update the version or name of a mirror
- Update the server.json configuration data
- Unlink a mirror from an MCP server (set mcp_server_id to null)`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
        version: { type: 'string', description: PARAM_DESCRIPTIONS.version },
        server_json: {
          oneOf: [{ type: 'object' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.server_json,
        },
        mcp_server_id: { type: ['number', 'null'], description: PARAM_DESCRIPTIONS.mcp_server_id },
        previous_name: { type: ['string', 'null'], description: PARAM_DESCRIPTIONS.previous_name },
        next_name: { type: ['string', 'null'], description: PARAM_DESCRIPTIONS.next_name },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UpdateUnofficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        const { id, server_json, ...rest } = validatedArgs;

        // If server_json provided, wrap it in { "server": ... } envelope
        let jsonb_data: Record<string, unknown> | undefined;
        if (server_json !== undefined) {
          const serverContent =
            typeof server_json === 'string' ? JSON.parse(server_json) : server_json;
          jsonb_data = { server: serverContent };
        }

        const params = {
          ...rest,
          ...(jsonb_data !== undefined ? { jsonb_data } : {}),
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

        const mirror = await client.updateUnofficialMirror(id, params);

        let content = `Successfully updated unofficial mirror!\n\n`;
        content += `**ID:** ${mirror.id}\n`;
        content += `**Name:** ${mirror.name}\n`;
        content += `**Version:** ${mirror.version}\n`;
        if (mirror.mcp_server_slug) {
          content += `**Linked Server:** ${mirror.mcp_server_slug}\n`;
        }
        if (mirror.updated_at) {
          content += `**Updated:** ${mirror.updated_at}\n`;
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
              text: `Error updating unofficial mirror: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
