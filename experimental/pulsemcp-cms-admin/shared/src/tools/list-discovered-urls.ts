import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  status: 'Filter by processing status: "pending" (unprocessed, default), "processed", or "all"',
  page: 'Page number for pagination. Default: 1',
  per_page: 'Results per page, range 1-100. Default: 50',
} as const;

const ListDiscoveredUrlsSchema = z.object({
  status: z.enum(['pending', 'processed', 'all']).optional().describe(PARAM_DESCRIPTIONS.status),
  page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.page),
  per_page: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.per_page),
});

export function listDiscoveredUrls(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_discovered_urls',
    description: `List discovered URLs filtered by processing status, with pagination. Returns URLs ordered by created_at ASC (oldest first).

Example response:
{
  "urls": [
    {
      "id": 12345,
      "url": "https://github.com/acme/acme-mcp-server",
      "source": "github_scraper",
      "created_at": "2026-02-24T08:30:00Z",
      "metadata": {}
    }
  ],
  "has_more": true,
  "total_count": 1042,
  "page": 1,
  "per_page": 50
}

Use cases:
- Browse unprocessed discovered URLs for review
- Page through pending URLs to process them into MCP implementations
- Check processed URLs for audit purposes`,
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'processed', 'all'],
          description: PARAM_DESCRIPTIONS.status,
        },
        page: { type: 'number', minimum: 1, description: PARAM_DESCRIPTIONS.page },
        per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.per_page,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = ListDiscoveredUrlsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getDiscoveredUrls({
          status: validatedArgs.status,
          page: validatedArgs.page,
          per_page: validatedArgs.per_page,
        });

        let content = `Found ${response.urls.length} discovered URLs`;
        content += ` (page ${response.page}, total: ${response.total_count}, has_more: ${response.has_more})`;
        content += ':\n\n';

        for (const [index, url] of response.urls.entries()) {
          content += `${index + 1}. **${url.url}** (ID: ${url.id})\n`;
          content += `   Source: ${url.source} | Created: ${url.created_at}\n`;
          if (Object.keys(url.metadata).length > 0) {
            content += `   Metadata: ${JSON.stringify(url.metadata)}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching discovered URLs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
