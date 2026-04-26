import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  name: 'The name of the unofficial mirror (e.g., "@modelcontextprotocol/server-filesystem")',
  version: 'The version of the mirror (e.g., "1.0.0")',
  server_json:
    'The server.json content to store. This will be automatically wrapped in a { "server": ... } envelope as required by the PulseMCP Sub-Registry API.',
  mcp_server_id: 'Optional ID of the MCP server to link this mirror to',
  previous_name: 'Optional previous name if this mirror was renamed',
  next_name: 'Optional next name if this mirror will be renamed',
} as const;

const CreateUnofficialMirrorSchema = z.object({
  name: z.string().describe(PARAM_DESCRIPTIONS.name),
  version: z.string().describe(PARAM_DESCRIPTIONS.version),
  server_json: z
    .union([z.record(z.unknown()), z.string()])
    .describe(PARAM_DESCRIPTIONS.server_json),
  mcp_server_id: z.number().optional().describe(PARAM_DESCRIPTIONS.mcp_server_id),
  previous_name: z.string().optional().describe(PARAM_DESCRIPTIONS.previous_name),
  next_name: z.string().optional().describe(PARAM_DESCRIPTIONS.next_name),
});

export function createUnofficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_unofficial_mirror',
    description: `Create a new unofficial mirror entry. Unofficial mirrors represent community-submitted MCP server definitions.

The server_json parameter accepts server.json content directly and automatically wraps it in a { "server": ... } envelope as required by the PulseMCP Sub-Registry API.

Example request:
{
  "name": "com.pulsemcp.mirror/example",
  "version": "0.0.1",
  "server_json": {
    "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
    "name": "com.pulsemcp.mirror/example",
    "title": "Example Server",
    "version": "0.0.1"
  }
}

Use cases:
- Create a new unofficial mirror for a community MCP server
- Import mirror data from external sources
- Set up test mirrors for development`,
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
        version: { type: 'string', description: PARAM_DESCRIPTIONS.version },
        server_json: {
          oneOf: [{ type: 'object' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.server_json,
        },
        mcp_server_id: { type: 'number', description: PARAM_DESCRIPTIONS.mcp_server_id },
        previous_name: { type: 'string', description: PARAM_DESCRIPTIONS.previous_name },
        next_name: { type: 'string', description: PARAM_DESCRIPTIONS.next_name },
      },
      required: ['name', 'version', 'server_json'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateUnofficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        // Wrap server_json in { "server": ... } envelope
        const serverContent =
          typeof validatedArgs.server_json === 'string'
            ? JSON.parse(validatedArgs.server_json)
            : validatedArgs.server_json;
        const jsonb_data = { server: serverContent };

        const mirror = await client.createUnofficialMirror({
          name: validatedArgs.name,
          version: validatedArgs.version,
          jsonb_data,
          mcp_server_id: validatedArgs.mcp_server_id,
          previous_name: validatedArgs.previous_name,
          next_name: validatedArgs.next_name,
        });

        let content = `Successfully created unofficial mirror!\n\n`;
        content += `**ID:** ${mirror.id}\n`;
        content += `**Name:** ${mirror.name}\n`;
        content += `**Version:** ${mirror.version}\n`;
        if (mirror.mcp_server_slug) {
          content += `**Linked Server:** ${mirror.mcp_server_slug}\n`;
        }
        if (mirror.created_at) {
          content += `**Created:** ${mirror.created_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating unofficial mirror: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
