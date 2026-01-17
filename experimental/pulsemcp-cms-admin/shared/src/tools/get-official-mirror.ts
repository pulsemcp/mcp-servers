import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the official mirror to retrieve',
} as const;

const GetOfficialMirrorSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function getOfficialMirror(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_official_mirror',
    description: `Retrieve a single official mirror by its ID. Returns detailed information including the full JSON data.

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
- Get detailed information about a specific official mirror
- Review the JSON data from the MCP Registry
- Check processing status and failure reasons`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetOfficialMirrorSchema.parse(args);
      const client = clientFactory();

      try {
        const mirror = await client.getOfficialMirror(validatedArgs.id);

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
