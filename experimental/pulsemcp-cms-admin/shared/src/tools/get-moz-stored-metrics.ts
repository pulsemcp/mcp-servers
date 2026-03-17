import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  server_id: 'MCP server ID (numeric) or slug to fetch stored MOZ data for',
  canonical_id: 'Optional canonical ID to filter results to a specific canonical URL',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetMozStoredMetricsSchema = z.object({
  server_id: z.string().describe(PARAM_DESCRIPTIONS.server_id),
  canonical_id: z.number().optional().describe(PARAM_DESCRIPTIONS.canonical_id),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getMozStoredMetrics(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_moz_stored_metrics',
    description: `List stored/historical MOZ data for a server's canonicals. Returns MOZ metrics that were previously collected and stored, ordered by timestamp descending (newest first).

Example response:
{
  "data": [
    {
      "id": 123,
      "canonical_id": 456,
      "canonical_url": "https://example.com/mcp",
      "scope": "url",
      "timestamp": "2026-03-01T00:00:00Z",
      "triggered_by": "weekly_collection",
      "page_authority": 42,
      "root_domains_to_page": 100,
      "site_metrics": { ... },
      "created_at": "2026-03-01T00:05:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 75,
    "has_next": true,
    "limit": 30
  }
}

Use cases:
- View historical MOZ metrics for an MCP server over time
- Track page authority changes for a server's canonical URLs
- Compare metrics across different canonicals for the same server`,
    inputSchema: {
      type: 'object',
      properties: {
        server_id: { type: 'string', description: PARAM_DESCRIPTIONS.server_id },
        canonical_id: { type: 'number', description: PARAM_DESCRIPTIONS.canonical_id },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.limit,
        },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
      required: ['server_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetMozStoredMetricsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getMozStoredMetrics({
          server_id: validatedArgs.server_id,
          canonical_id: validatedArgs.canonical_id,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        let content = `**Stored MOZ Metrics for server "${validatedArgs.server_id}"**`;
        if (validatedArgs.canonical_id) {
          content += ` (canonical ID: ${validatedArgs.canonical_id})`;
        }
        content += '\n\n';

        const { meta } = response;
        content += `Page ${meta.current_page} of ${meta.total_pages} (${meta.total_count} total records)\n\n`;

        if (response.data.length === 0) {
          content += 'No stored MOZ data found.\n';
        } else {
          for (const [index, record] of response.data.entries()) {
            content += `${index + 1}. **${record.canonical_url}** (ID: ${record.id})\n`;
            content += `   Canonical ID: ${record.canonical_id}`;
            if (record.scope) content += ` | Scope: ${record.scope}`;
            content += '\n';
            content += `   Timestamp: ${record.timestamp} | Triggered by: ${record.triggered_by}\n`;
            if (record.page_authority !== undefined)
              content += `   Page Authority: ${record.page_authority}\n`;
            if (record.root_domains_to_page !== undefined)
              content += `   Root Domains to Page: ${record.root_domains_to_page}\n`;
            if (record.site_metrics && Object.keys(record.site_metrics).length > 0) {
              content += `   Site Metrics: ${JSON.stringify(record.site_metrics)}\n`;
            }
            content += '\n';
          }
        }

        if (meta.has_next) {
          content += `_More results available. Use offset=${meta.current_page * meta.limit} to get the next page._`;
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching stored MOZ metrics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
