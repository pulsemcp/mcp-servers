import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  search: 'Search query to filter authors by name (e.g., "Sarah", "Chen", "John Smith")',
  page: 'Page number for pagination, starting from 1. Default: 1',
} as const;

const GetAuthorsSchema = z.object({
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
  page: z.number().optional().default(1).describe(PARAM_DESCRIPTIONS.page),
});

export function getAuthors(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_authors',
    description: `Retrieve a list of authors from the PulseMCP CMS who can create newsletter posts. Returns formatted markdown with author details.

The response is formatted as markdown with:
- Total count and pagination info
- Author entries, each showing:
  - Name (as section header)
  - Slug (required for creating/updating posts)
  - Bio (if available)
  - Avatar image URL (if available)
  - Created date


Use cases:
- Find available authors before creating a new newsletter post
- Search for a specific author by name to get their slug
- List all authors to see who can contribute to the newsletter
- Verify an author exists before assigning them to a post
- Browse author profiles and specializations
- Get author metadata like bio and avatar for display`,
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.search,
        },
        page: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.page,
          default: 1,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetAuthorsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getAuthors(validatedArgs);

        // Format the response for MCP
        let content = `Found ${response.authors.length} authors`;

        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages})`;
        }

        content += '\n\n';

        if (response.authors.length === 0) {
          content += 'No authors found matching your criteria.';
        } else {
          response.authors.forEach((author) => {
            content += `## ${author.name}\n`;
            content += `**Slug:** ${author.slug} (ID: ${author.id})\n`;

            if (author.bio) {
              content += `**Bio:** ${author.bio}\n`;
            }

            if (author.image_url) {
              content += `**Avatar:** ${author.image_url}\n`;
            }

            content += `**Created:** ${new Date(author.created_at).toLocaleDateString()}\n\n`;
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching authors: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
