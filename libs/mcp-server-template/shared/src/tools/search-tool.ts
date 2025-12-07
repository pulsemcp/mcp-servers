import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IExampleClient } from '../example-client/example-client.js';

// =============================================================================
// MULTI-MODE TOOL EXAMPLE
// =============================================================================
// This tool demonstrates how to create a single tool with multiple operation modes.
// Use Zod refinement to ensure at least one mode is triggered.
// This pattern is useful when you have related operations that share context.
// =============================================================================

const PARAM_DESCRIPTIONS = {
  id: 'Unique identifier to look up a specific item directly. ' +
    'When provided, performs a direct lookup instead of search. ' +
    'Example: "item-123", "abc-def-ghi"',
  query:
    'Search query to find items by name, description, or content. ' +
    'Supports partial matching and is case-insensitive. ' +
    'Examples: "user settings", "api key", "error log"',
  limit:
    'Maximum number of results to return (1-100). ' +
    'Default: 10. Use lower values for faster responses, higher for comprehensive results.',
  offset:
    'Number of results to skip for pagination. ' +
    'Default: 0. Use with limit for paginated results (e.g., offset=10, limit=10 for page 2).',
  sortBy:
    'Field to sort results by. Options: "name" (alphabetical), "created" (newest first), "updated" (recently modified). ' +
    'Default: "name"',
} as const;

// Schema with Zod refinement to ensure either id OR query is provided
export const SearchToolSchema = z
  .object({
    id: z.string().optional().describe(PARAM_DESCRIPTIONS.id),
    query: z.string().optional().describe(PARAM_DESCRIPTIONS.query),
    limit: z.number().min(1).max(100).default(10).describe(PARAM_DESCRIPTIONS.limit),
    offset: z.number().min(0).default(0).describe(PARAM_DESCRIPTIONS.offset),
    sortBy: z.enum(['name', 'created', 'updated']).default('name').describe(PARAM_DESCRIPTIONS.sortBy),
  })
  .refine((data) => data.id !== undefined || data.query !== undefined, {
    message: 'Either id or query must be provided',
  });

const TOOL_DESCRIPTION = `Search for items or look up a specific item by ID.

This tool supports two modes:
1. **Direct lookup**: Provide an \`id\` to retrieve a specific item
2. **Search mode**: Provide a \`query\` to search across all items

**Returns:**
- Direct lookup: Single item with full details (id, name, value, metadata)
- Search mode: List of matching items with relevance scores

**Pagination:**
Use \`limit\` and \`offset\` for paginated results. The response includes:
- Total count of matching items
- Whether more results are available (hasMore)
- Suggested next offset for pagination

**Use cases:**
- Find items by partial name or description
- Retrieve a known item by its ID
- Browse items with pagination
- Sort results by different criteria

**Note:** Search is case-insensitive and supports partial matching.`;

/**
 * Multi-mode search tool demonstrating the pattern for tools with multiple operation modes.
 */
export function searchTool(_server: Server, clientFactory: () => IExampleClient) {
  return {
    name: 'search_items',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.id,
        },
        query: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.query,
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 10,
          description: PARAM_DESCRIPTIONS.limit,
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: PARAM_DESCRIPTIONS.offset,
        },
        sortBy: {
          type: 'string',
          enum: ['name', 'created', 'updated'],
          default: 'name',
          description: PARAM_DESCRIPTIONS.sortBy,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = SearchToolSchema.parse(args);
        const client = clientFactory();

        // =================================================================
        // MODE 1: Direct lookup by ID
        // =================================================================
        if (validatedArgs.id !== undefined) {
          const item = await client.getItem(validatedArgs.id);

          // Format single item response
          const output = [
            `## Item: ${item.name}`,
            '',
            `**ID:** ${item.id}`,
            `**Value:** ${item.value}`,
          ].join('\n');

          return {
            content: [{ type: 'text', text: output }],
          };
        }

        // =================================================================
        // MODE 2: Search by query
        // =================================================================
        if (validatedArgs.query !== undefined) {
          const results = await client.searchItems(validatedArgs.query, {
            limit: validatedArgs.limit,
            offset: validatedArgs.offset,
            sortBy: validatedArgs.sortBy,
          });

          if (results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No items found matching "${validatedArgs.query}"`,
                },
              ],
            };
          }

          // Format search results with markdown
          const hasMore = results.length === validatedArgs.limit;
          const lines = [
            `## Search Results for "${validatedArgs.query}"`,
            '',
            `Found ${results.length} item(s)${hasMore ? ' (more available)' : ''}:`,
            '',
          ];

          results.forEach((item, index) => {
            lines.push(`${index + 1}. **${item.name}** (ID: ${item.id})`);
            lines.push(`   Score: ${(item.score * 100).toFixed(1)}%`);
            lines.push('');
          });

          // Add pagination guidance
          if (hasMore) {
            const nextOffset = validatedArgs.offset + validatedArgs.limit;
            lines.push(`---`);
            lines.push(`*More results available. Use offset=${nextOffset} to see next page.*`);
          }

          return {
            content: [{ type: 'text', text: lines.join('\n') }],
          };
        }

        // This shouldn't happen due to Zod refinement, but TypeScript needs it
        return {
          content: [{ type: 'text', text: 'Either id or query must be provided' }],
          isError: true,
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching items: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
