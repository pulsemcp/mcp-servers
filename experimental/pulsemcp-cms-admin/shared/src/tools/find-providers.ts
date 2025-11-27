import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'Provider ID to retrieve a specific provider',
  query: 'Search query to find providers by name, URL, or slug',
  limit: 'Maximum number of results to return (1-100, default: 30)',
  offset: 'Number of results to skip for pagination (default: 0)',
} as const;

const FindProvidersSchema = z
  .object({
    id: z.number().int().positive().optional().describe(PARAM_DESCRIPTIONS.id),
    query: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.query),
    limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
    offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
  })
  .refine((data) => data.id !== undefined || data.query !== undefined, {
    message: 'Either id or query must be provided',
  });

export function findProviders(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'find_providers',
    description: `Find providers (organizations/individuals) in the PulseMCP registry.

This tool can operate in two modes:

1. **Find by ID**: Retrieve a specific provider by its numeric ID
   - Returns a single provider with detailed information
   - Returns null if not found

2. **Search by query**: Search for providers by name, URL, or slug
   - Searches across provider name, URL, and slug fields (case-insensitive)
   - Returns a list of matching providers with pagination support
   - Each result includes implementation counts

Provider information includes:
- ID and slug
- Name and URL
- Number of associated implementations
- Creation and update timestamps

Use cases:
- Look up a specific provider by ID
- Search for providers by name (e.g., "anthropic", "modelcontextprotocol")
- Find providers by partial name matches
- Discover all providers for an organization
- Check how many implementations a provider has published

Note: This tool queries the PulseMCP registry API. Results depend on what has been published to the registry.`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.id,
        },
        query: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.query,
        },
        limit: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.limit,
        },
        offset: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.offset,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = FindProvidersSchema.parse(args);
      const client = clientFactory();

      try {
        // Mode 1: Find by ID
        if (validatedArgs.id !== undefined) {
          const provider = await client.getProviderById(validatedArgs.id);

          if (!provider) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Provider with ID ${validatedArgs.id} not found.`,
                },
              ],
            };
          }

          let content = `**${provider.name}**\n`;
          content += `ID: ${provider.id}\n`;
          content += `Slug: ${provider.slug}\n`;

          if (provider.url) {
            content += `URL: ${provider.url}\n`;
          }

          if (provider.implementations_count !== undefined) {
            content += `Implementations: ${provider.implementations_count}\n`;
          }

          if (provider.created_at) {
            content += `Created: ${provider.created_at}\n`;
          }

          return {
            content: [
              {
                type: 'text',
                text: content.trim(),
              },
            ],
          };
        }

        // Mode 2: Search by query
        if (validatedArgs.query !== undefined) {
          const response = await client.searchProviders({
            query: validatedArgs.query,
            limit: validatedArgs.limit,
            offset: validatedArgs.offset,
          });

          let content = `Found ${response.providers.length} provider(s) matching "${validatedArgs.query}"`;

          if (response.pagination) {
            content += ` (showing ${response.providers.length} of ${response.pagination.total_count} total)`;
          }

          content += ':\n\n';

          for (const [index, provider] of response.providers.entries()) {
            content += `${index + 1}. **${provider.name}**\n`;
            content += `   ID: ${provider.id} | Slug: ${provider.slug}\n`;

            if (provider.url) {
              content += `   URL: ${provider.url}\n`;
            }

            if (provider.implementations_count !== undefined) {
              content += `   Implementations: ${provider.implementations_count}\n`;
            }

            content += '\n';
          }

          if (response.pagination?.has_next) {
            const nextOffset = (validatedArgs.offset || 0) + (validatedArgs.limit || 30);
            content += `\n---\nMore results available. Use offset=${nextOffset} to see the next page.`;
          }

          return {
            content: [
              {
                type: 'text',
                text: content.trim(),
              },
            ],
          };
        }

        // This should never happen due to zod refinement, but TypeScript needs it
        throw new Error('Either id or query must be provided');
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error finding providers: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
