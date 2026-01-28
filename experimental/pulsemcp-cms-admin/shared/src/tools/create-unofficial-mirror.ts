import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  name: 'The name of the unofficial mirror (e.g., "@modelcontextprotocol/server-filesystem")',
  version: 'The version of the mirror (e.g., "1.0.0")',
  server_json:
    'The server.json content to store. This will be automatically wrapped in a { "server": ... } envelope. Use this for better ergonomics instead of jsonb_data.',
  jsonb_data:
    'Raw JSON data to store (advanced). If using server.json content, prefer the server_json parameter which auto-wraps it.',
  mcp_server_id: 'Optional ID of the MCP server to link this mirror to',
  previous_name: 'Optional previous name if this mirror was renamed',
  next_name: 'Optional next name if this mirror will be renamed',
} as const;

const CreateUnofficialMirrorSchema = z
  .object({
    name: z.string().describe(PARAM_DESCRIPTIONS.name),
    version: z.string().describe(PARAM_DESCRIPTIONS.version),
    server_json: z
      .union([z.record(z.unknown()), z.string()])
      .optional()
      .describe(PARAM_DESCRIPTIONS.server_json),
    jsonb_data: z
      .union([z.record(z.unknown()), z.string()])
      .optional()
      .describe(PARAM_DESCRIPTIONS.jsonb_data),
    mcp_server_id: z.number().optional().describe(PARAM_DESCRIPTIONS.mcp_server_id),
    previous_name: z.string().optional().describe(PARAM_DESCRIPTIONS.previous_name),
    next_name: z.string().optional().describe(PARAM_DESCRIPTIONS.next_name),
  })
  .refine((data) => data.server_json !== undefined || data.jsonb_data !== undefined, {
    message: 'Either server_json or jsonb_data must be provided',
  });

export function createUnofficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_unofficial_mirror',
    description: `Create a new unofficial mirror entry. Unofficial mirrors represent community-submitted MCP server definitions.

RECOMMENDED: Use the server_json parameter to pass server.json content directly. It will be automatically wrapped in a { "server": ... } envelope as required by the PulseMCP Sub-Registry API.

Example request using server_json (recommended):
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

Alternative using jsonb_data (advanced - no auto-wrapping):
{
  "name": "@modelcontextprotocol/server-filesystem",
  "version": "1.0.0",
  "jsonb_data": {
    "server": {
      "$schema": "...",
      "name": "...",
      "title": "..."
    }
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
        jsonb_data: {
          oneOf: [{ type: 'object' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.jsonb_data,
        },
        mcp_server_id: { type: 'number', description: PARAM_DESCRIPTIONS.mcp_server_id },
        previous_name: { type: 'string', description: PARAM_DESCRIPTIONS.previous_name },
        next_name: { type: 'string', description: PARAM_DESCRIPTIONS.next_name },
      },
      required: ['name', 'version'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateUnofficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        // Determine jsonb_data: prefer server_json (auto-wrapped) over raw jsonb_data
        let jsonb_data: Record<string, unknown>;
        if (validatedArgs.server_json !== undefined) {
          // Wrap server_json in { "server": ... } envelope
          const serverContent =
            typeof validatedArgs.server_json === 'string'
              ? JSON.parse(validatedArgs.server_json)
              : validatedArgs.server_json;
          jsonb_data = { server: serverContent };
        } else if (validatedArgs.jsonb_data !== undefined) {
          // Use raw jsonb_data as-is
          jsonb_data =
            typeof validatedArgs.jsonb_data === 'string'
              ? JSON.parse(validatedArgs.jsonb_data)
              : validatedArgs.jsonb_data;
        } else {
          // This should not happen due to zod refinement, but TypeScript needs it
          throw new Error('Either server_json or jsonb_data must be provided');
        }

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
