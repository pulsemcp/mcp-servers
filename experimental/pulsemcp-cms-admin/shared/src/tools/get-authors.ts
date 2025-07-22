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
    description: `Retrieve a list of authors from the PulseMCP CMS who can create newsletter posts. This tool is essential for finding the correct author_slug to use when creating new posts with the draft_newsletter_post tool.

Example response:
{
  "authors": [
    {
      "id": 1,
      "name": "Sarah Chen",
      "slug": "sarah-chen",
      "bio": "Senior Developer Advocate specializing in AI integrations and MCP",
      "avatar_url": "https://cdn.pulsemcp.com/authors/sarah-chen.jpg",
      "created_at": "2023-06-15T08:00:00Z",
      "updated_at": "2024-01-10T12:30:00Z"
    },
    {
      "id": 2,
      "name": "John Smith",
      "slug": "john-smith",
      "bio": "Technical Writer focused on developer documentation",
      "avatar_url": "https://cdn.pulsemcp.com/authors/john-smith.jpg",
      "created_at": "2023-07-20T10:00:00Z",
      "updated_at": "2024-01-08T15:45:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 3,
    "total_count": 12
  }
}

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
            content += `**Slug:** ${author.slug}\n`;

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
