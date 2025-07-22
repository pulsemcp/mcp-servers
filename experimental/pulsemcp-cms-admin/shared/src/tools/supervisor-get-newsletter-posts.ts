import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { getSupervisorPosts } from '../pulsemcp-admin-client/pulsemcp-admin-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  search: 'Search posts by title or content (e.g., "MCP protocol", "Claude integration")',
  page: 'Page number for pagination (defaults to 1)',
  perPage: 'Number of posts per page (defaults to 25, max 100)',
  status: 'Filter posts by status: draft, published, or archived',
} as const;

const SupervisorGetNewsletterPostsSchema = z.object({
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
  page: z.number().int().positive().optional().describe(PARAM_DESCRIPTIONS.page),
  perPage: z.number().int().positive().max(100).optional().describe(PARAM_DESCRIPTIONS.perPage),
  status: z.enum(['draft', 'published', 'archived']).optional().describe(PARAM_DESCRIPTIONS.status),
});

export function supervisorGetNewsletterPosts(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'supervisor_get_newsletter_posts',
    description: `Search and list newsletter posts using the supervisor endpoint with enhanced filtering options. This provides access to posts with their numeric IDs and additional administrative metadata.

This tool returns posts with full details including numeric IDs, making it ideal for:
- Administrative workflows requiring post IDs
- Bulk operations on multiple posts
- Integration with external systems that use numeric IDs
- Advanced filtering by status

Example response:
{
  "posts": [
    {
      "id": 123,
      "title": "Getting Started with MCP Servers",
      "slug": "getting-started-mcp-servers",
      "status": "published",
      "author": {
        "id": 1,
        "name": "Sarah Chen"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "short_description": "Learn how to build your first MCP server"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_count": 123,
    "per_page": 25
  }
}

Use cases:
- List all posts with their numeric IDs for administrative purposes
- Search posts across all statuses (draft, published, archived)
- Access posts through supervisor endpoints for enhanced permissions
- Paginate through large collections of posts efficiently`,
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
        },
        perPage: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.perPage,
        },
        status: {
          type: 'string',
          enum: ['draft', 'published', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = SupervisorGetNewsletterPostsSchema.parse(args);
      const client = clientFactory();

      // Get API key and base URL from the client
      const apiKey =
        (client as { apiKey?: string }).apiKey || process.env.PULSEMCP_ADMIN_API_KEY || '';
      const baseUrl = (client as { baseUrl?: string }).baseUrl || 'https://admin.pulsemcp.com';

      try {
        const result = await getSupervisorPosts(apiKey, baseUrl, validatedArgs);

        // Format the response for MCP
        let content = `# Newsletter Posts (Supervisor Endpoint)\n\n`;
        content += `Found ${result.pagination.total_count} posts`;
        if (validatedArgs.search) {
          content += ` matching "${validatedArgs.search}"`;
        }
        if (validatedArgs.status) {
          content += ` with status: ${validatedArgs.status}`;
        }
        content += `\n\n`;

        content += `**Page ${result.pagination.current_page} of ${result.pagination.total_pages}** (${result.pagination.per_page} per page)\n\n`;

        if (result.posts.length === 0) {
          content += '*No posts found matching the criteria.*\n';
        } else {
          content += '## Posts\n\n';
          result.posts.forEach((post, index) => {
            content += `### ${index + 1}. ${post.title}\n`;
            content += `- **ID:** ${post.id}\n`;
            content += `- **Slug:** ${post.slug}\n`;
            content += `- **Status:** ${post.status}\n`;
            if (post.author) {
              content += `- **Author:** ${post.author.name}\n`;
            }
            content += `- **Created:** ${new Date(post.created_at).toLocaleDateString()}\n`;
            if (post.short_description) {
              content += `- **Summary:** ${post.short_description}\n`;
            }
            content += '\n';
          });
        }

        content += '\n## Pagination Info\n\n';
        content += `- Current page: ${result.pagination.current_page}\n`;
        content += `- Total pages: ${result.pagination.total_pages}\n`;
        content += `- Total posts: ${result.pagination.total_count}\n`;
        content += `- Posts per page: ${result.pagination.per_page}\n`;

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
              text: `Error fetching posts via supervisor: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
