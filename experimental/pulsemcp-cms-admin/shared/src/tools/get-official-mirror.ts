import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the official mirror to retrieve',
  name: 'The name of the official mirror (e.g., "@anthropic/claude-code"). If multiple mirrors match, returns the first one.',
} as const;

const GetOfficialMirrorSchema = z
  .object({
    id: z.number().optional().describe(PARAM_DESCRIPTIONS.id),
    name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  })
  .refine((data) => data.id !== undefined || data.name !== undefined, {
    message: 'Either id or name must be provided',
  });

export function getOfficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_official_mirror',
    description: `Retrieve a single official mirror by its ID or name. Returns detailed information including the full JSON data.

Example response:
{
  "id": 123,
  "name": "@modelcontextprotocol/server-github",
  "version": "1.0.0",
  "official_version_id": "v1.0.0",
  "jsonb_data": { "tools": [...], "resources": [...] },
  "mcp_server_id": 456,
  "processed": true,
  "queue_status": "approved"
}

Use cases:
- Get detailed information about a specific official mirror by ID or name
- Review the JSON data from the MCP Registry
- Check processing status and failure reasons

Note: Either id or name must be provided.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetOfficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        let mirror;
        if (validatedArgs.id !== undefined) {
          mirror = await client.getOfficialMirror(validatedArgs.id);
        } else if (validatedArgs.name) {
          // Search by name and get the first result
          const response = await client.getOfficialMirrors({ q: validatedArgs.name, limit: 1 });
          if (response.mirrors.length === 0) {
            throw new Error(`No official mirror found with name matching "${validatedArgs.name}"`);
          }
          // Get full details for the first match
          mirror = await client.getOfficialMirror(response.mirrors[0].id);
        } else {
          throw new Error('Either id or name must be provided');
        }

        let content = `**Official Mirror Details**\n\n`;
        content += `**ID:** ${mirror.id}\n`;
        content += `**Name:** ${mirror.name}\n`;
        content += `**Version:** ${mirror.version}\n`;

        if (mirror.official_version_id) {
          content += `**Official Version ID:** ${mirror.official_version_id}\n`;
        }

        if (mirror.mcp_server_slug) {
          content += `**Linked Server:** ${mirror.mcp_server_slug} (ID: ${mirror.mcp_server_id})\n`;
        }

        content += `**Processed:** ${mirror.processed ? 'Yes' : 'No'}\n`;

        if (mirror.queue_status) {
          content += `**Queue Status:** ${mirror.queue_status}\n`;
        }
        if (mirror.queue_id) {
          content += `**Queue ID:** ${mirror.queue_id}\n`;
        }
        if (mirror.processing_failure_reason) {
          content += `**Failure Reason:** ${mirror.processing_failure_reason}\n`;
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
              text: `Error fetching official mirror: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
