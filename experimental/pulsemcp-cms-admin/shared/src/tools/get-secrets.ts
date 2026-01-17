import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  q: 'Search query to filter by slug or title',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetSecretsSchema = z.object({
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getSecrets(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_secrets',
    description: `Retrieve a paginated list of secrets. Secrets are 1Password item references used by MCP servers for authentication.

Example response:
{
  "secrets": [
    {
      "id": 123,
      "slug": "github-api-key",
      "onepassword_item_id": "op://vault/item/field",
      "title": "GitHub API Key",
      "mcp_servers_count": 3,
      "mcp_server_slugs": ["github", "pr-reviewer", "issue-tracker"]
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 5, "total_count": 50 }
}

Use cases:
- Browse all secrets in the system
- Search for secrets by slug or title
- Find which MCP servers use a particular secret
- Audit secret usage across servers`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetSecretsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getSecrets(validatedArgs);

        let content = `Found ${response.secrets.length} secrets`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, secret] of response.secrets.entries()) {
          content += `${index + 1}. **${secret.slug}** (ID: ${secret.id})\n`;
          if (secret.title) {
            content += `   Title: ${secret.title}\n`;
          }
          content += `   1Password: ${secret.onepassword_item_id}\n`;
          if (secret.mcp_servers_count !== undefined) {
            content += `   Used by ${secret.mcp_servers_count} server(s)`;
            if (secret.mcp_server_slugs && secret.mcp_server_slugs.length > 0) {
              content += `: ${secret.mcp_server_slugs.join(', ')}`;
            }
            content += '\n';
          }
          if (secret.description) {
            content += `   Description: ${secret.description}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching secrets: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
