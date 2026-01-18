import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  q: 'Search query to filter by name',
  mcp_server_id: 'Filter by linked MCP server ID',
  status: 'Filter by queue status (pending/approved/rejected)',
  processed: 'Filter by processed status (true/false)',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetOfficialMirrorsSchema = z.object({
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  mcp_server_id: z.number().optional().describe(PARAM_DESCRIPTIONS.mcp_server_id),
  status: z.string().optional().describe(PARAM_DESCRIPTIONS.status),
  processed: z.boolean().optional().describe(PARAM_DESCRIPTIONS.processed),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getOfficialMirrors(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_official_mirrors',
    description: `Retrieve a paginated list of official mirrors from the MCP Registry. These are mirrors that come from the official MCP Registry's server.json submissions.

Example response:
{
  "mirrors": [
    {
      "id": 123,
      "name": "@modelcontextprotocol/server-github",
      "version": "1.0.0",
      "official_version_id": "v1.0.0",
      "mcp_server_id": 456,
      "processed": true,
      "queue_status": "approved"
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 5, "total_count": 150 }
}

Status meanings:
- pending: Awaiting review
- approved: Accepted into PulseMCP
- rejected: Not accepted

Use cases:
- Browse official mirrors from the MCP Registry
- Search for specific official mirrors by name
- Filter by processing status to find unprocessed items
- Review mirrors by their queue status`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        mcp_server_id: { type: 'number', description: PARAM_DESCRIPTIONS.mcp_server_id },
        status: { type: 'string', description: PARAM_DESCRIPTIONS.status },
        processed: { type: 'boolean', description: PARAM_DESCRIPTIONS.processed },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetOfficialMirrorsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getOfficialMirrors(validatedArgs);

        let content = `Found ${response.mirrors.length} official mirrors`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, mirror] of response.mirrors.entries()) {
          content += `${index + 1}. **${mirror.name}** (ID: ${mirror.id})\n`;
          content += `   Version: ${mirror.version}\n`;
          if (mirror.official_version_id) {
            content += `   Official Version ID: ${mirror.official_version_id}\n`;
          }
          if (mirror.mcp_server_slug) {
            content += `   Linked Server: ${mirror.mcp_server_slug} (ID: ${mirror.mcp_server_id})\n`;
          }
          content += `   Processed: ${mirror.processed ? 'Yes' : 'No'}\n`;
          if (mirror.queue_status) {
            content += `   Queue Status: ${mirror.queue_status}\n`;
          }
          if (mirror.processing_failure_reason) {
            content += `   Failure Reason: ${mirror.processing_failure_reason}\n`;
          }
          if (mirror.datetime_ingested) {
            content += `   Ingested: ${new Date(mirror.datetime_ingested).toLocaleDateString()}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching official mirrors: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
