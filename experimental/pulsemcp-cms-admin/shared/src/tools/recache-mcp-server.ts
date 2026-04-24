import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  slug: 'The slug of the MCP server to recache (e.g., "filesystem")',
} as const;

const RecacheMCPServerSchema = z.object({
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
});

export function recacheMCPServer(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'recache_mcp_server',
    description: `Refresh the cache for a specific MCP server. Clears and warms the show page, card fragments across all sort variations, canonical URLs, and parent pages.

Example request:
{
  "slug": "filesystem"
}

Use cases:
- Force a cache refresh after updating server data
- Fix stale cache entries for a specific server
- Warm caches after content changes`,
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: PARAM_DESCRIPTIONS.slug },
      },
      required: ['slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = RecacheMCPServerSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.recacheMCPServer(validatedArgs.slug);

        return { content: [{ type: 'text', text: result.message }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error recaching MCP server: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
