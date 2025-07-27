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
    description: `Retrieve a paginated list of newsletter posts from the PulseMCP CMS. Returns formatted markdown with post summaries and metadata.

The response is formatted as markdown with:
- Total count and pagination info
- Numbered list of posts, each showing:
  - Title and slug
  - Status and category
  - Author name (if available)
  - Created date
  - Short description (if available)

Note: The list view does NOT include post body content. Use get_newsletter_post to retrieve full post details.

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
