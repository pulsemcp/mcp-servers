import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { RedirectStatus } from '../types.js';

const PARAM_DESCRIPTIONS = {
  q: 'Search query to filter by from or to paths',
  status: 'Filter by status (draft, active, paused, archived)',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetRedirectsSchema = z.object({
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  status: z
    .enum(['draft', 'active', 'paused', 'archived'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getRedirects(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_redirects',
    description: `Retrieve a paginated list of URL redirects from the PulseMCP Admin API. Redirects manage URL routing on the PulseMCP website.

Example response:
{
  "redirects": [
    {
      "id": 123,
      "from": "/old-page",
      "to": "/new-page",
      "status": "active"
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 5, "total_count": 150 }
}

Use cases:
- Browse redirects to find existing URL mappings
- Search for specific redirects by path
- Filter redirects by status (draft, active, paused, archived)
- Review redirects before activating or modifying them`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'paused', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetRedirectsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getRedirects({
          q: validatedArgs.q,
          status: validatedArgs.status as RedirectStatus | undefined,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        let content = `Found ${response.redirects.length} redirects`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, redirect] of response.redirects.entries()) {
          content += `${index + 1}. **${redirect.from}** → ${redirect.to} (ID: ${redirect.id})\n`;
          content += `   Status: ${redirect.status}\n`;
          if (redirect.created_at) {
            content += `   Created: ${new Date(redirect.created_at).toLocaleDateString()}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching redirects: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
