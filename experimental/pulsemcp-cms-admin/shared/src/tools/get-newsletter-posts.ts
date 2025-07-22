import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  search:
    'Search query to filter posts by title, content, or author name (e.g., "MCP guide", "newsletter", "John Doe")',
  sort: 'Field to sort by. Options: "created_at", "updated_at", "title", "status". Default: "created_at"',
  direction:
    'Sort direction - "asc" for ascending (oldest first) or "desc" for descending (newest first). Default: "desc"',
  page: 'Page number for pagination, starting from 1. Default: 1',
} as const;

const GetNewsletterPostsSchema = z.object({
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
  sort: z.string().optional().describe(PARAM_DESCRIPTIONS.sort),
  direction: z.enum(['asc', 'desc']).optional().describe(PARAM_DESCRIPTIONS.direction),
  page: z.number().optional().describe(PARAM_DESCRIPTIONS.page),
});

export function getNewsletterPosts(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_newsletter_posts',
    description: `Retrieve a paginated list of newsletter posts from the PulseMCP CMS. This tool provides comprehensive search and filtering capabilities to find existing content, check post statuses, and browse the newsletter archive.

Example response:
{
  "posts": [
    {
      "title": "Introducing the Claude MCP Protocol",
      "slug": "introducing-claude-mcp-protocol",
      "status": "live",
      "category": "newsletter",
      "author": { "name": "Sarah Chen" },
      "created_at": "2024-01-15T10:30:00Z",
      "short_description": "Learn about the new Model Context Protocol and how it enables powerful AI integrations"
    },
    {
      "title": "Best Practices for MCP Server Development",
      "slug": "mcp-server-best-practices",
      "status": "draft",
      "category": "newsletter",
      "author": { "name": "John Smith" },
      "created_at": "2024-01-12T14:20:00Z",
      "short_description": "A comprehensive guide to building production-ready MCP servers"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 47
  }
}

Status meanings:
- draft: Unpublished posts that are being written or edited
- live: Published posts visible on the website

Use cases:
- Browse all newsletter posts before creating new content to avoid duplicates
- Search for posts on specific topics or by specific authors
- Find draft posts that need to be completed or published
- Review recent posts to maintain consistency in style and topics
- Check the status of posts created by team members
- Export post metadata for reporting or analytics`,
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.search,
        },
        sort: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.sort,
        },
        direction: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: PARAM_DESCRIPTIONS.direction,
        },
        page: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.page,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetNewsletterPostsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getPosts(validatedArgs);

        // Format the response for MCP
        let content = `Found ${response.posts.length} newsletter posts`;

        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages})`;
        }

        content += ':\n\n';

        response.posts.forEach((post, index) => {
          content += `${index + 1}. **${post.title}** (${post.slug})\n`;
          content += `   Status: ${post.status} | Category: ${post.category}\n`;
          if (post.author) {
            content += `   Author: ${post.author.name}\n`;
          }
          content += `   Created: ${new Date(post.created_at).toLocaleDateString()}\n`;
          if (post.short_description) {
            content += `   ${post.short_description}\n`;
          }
          content += '\n';
        });

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
              text: `Error fetching newsletter posts: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
