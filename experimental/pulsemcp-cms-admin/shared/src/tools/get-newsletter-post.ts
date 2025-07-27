import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  slug: 'The unique slug identifier for the post (e.g., "introducing-claude-mcp-protocol", "mcp-server-best-practices")',
} as const;

const GetNewsletterPostSchema = z.object({
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
});

export function getNewsletterPost(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_newsletter_post',
    description: `Retrieve complete details for a specific newsletter post by its unique slug identifier. Returns formatted markdown with all post metadata and content.

The response is formatted as markdown with sections for:
- Post title and basic metadata (slug, status, category, author, dates)
- Summary/short description
- Full HTML content (body field) as raw HTML
- Complete metadata including all URLs, SEO tags, and featured items
- Table of contents (if available) as raw HTML

All available fields from the post are included:
- title, slug, status, category
- author (id and name)
- created_at, updated_at, last_updated
- short_title, short_description
- body (raw HTML content)
- table_of_contents (raw HTML)
- image_url, preview_image_url, share_image
- title_tag, description_tag
- featured_mcp_server_ids, featured_mcp_client_ids

Status meanings:
- draft: Unpublished posts that are being written or edited
- live: Published posts visible on the website

Use cases:
- View the complete content of a specific newsletter post
- Check the current status and metadata of a post before editing
- Retrieve SEO fields for optimization or analysis
- Get the full HTML content for preview or export
- Review featured MCP servers and clients associated with a post
- Verify author information and timestamps`,
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.slug,
        },
      },
      required: ['slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetNewsletterPostSchema.parse(args);
      const client = clientFactory();

      try {
        const post = await client.getPost(validatedArgs.slug);

        // Format the response for MCP
        let content = `# ${post.title}\n\n`;
        content += `**Slug:** ${post.slug}\n`;
        content += `**Status:** ${post.status} | **Category:** ${post.category}\n`;

        if (post.author) {
          content += `**Author:** ${post.author.name} (ID: ${post.author.id})\n`;
        } else if (post.author_id) {
          content += `**Author ID:** ${post.author_id}\n`;
        }

        content += `**Created:** ${new Date(post.created_at).toLocaleDateString()}\n`;
        content += `**Updated:** ${new Date(post.updated_at).toLocaleDateString()}\n`;

        if (post.last_updated) {
          content += `**Last Updated:** ${post.last_updated}\n`;
        }

        content += '\n';

        if (post.short_title) {
          content += `**Short Title:** ${post.short_title}\n`;
        }

        if (post.short_description) {
          content += `**Summary:** ${post.short_description}\n\n`;
        }

        if (post.body) {
          content += `## Content\n\n${post.body}\n\n`;
        } else {
          content += `## Content\n\n*Content not available*\n\n`;
        }

        if (post.table_of_contents) {
          content += `## Table of Contents\n\n${post.table_of_contents}\n\n`;
        }

        // Add metadata section
        content += `## Metadata\n\n`;

        if (post.image_url) {
          content += `- **Image URL:** ${post.image_url}\n`;
        }
        if (post.preview_image_url) {
          content += `- **Preview Image:** ${post.preview_image_url}\n`;
        }
        if (post.share_image) {
          content += `- **Share Image:** ${post.share_image}\n`;
        }
        if (post.title_tag) {
          content += `- **Title Tag:** ${post.title_tag}\n`;
        }
        if (post.description_tag) {
          content += `- **Description Tag:** ${post.description_tag}\n`;
        }

        if (post.featured_mcp_server_ids && post.featured_mcp_server_ids.length > 0) {
          content += `- **Featured MCP Servers:** ${post.featured_mcp_server_ids.join(', ')}\n`;
        }
        if (post.featured_mcp_client_ids && post.featured_mcp_client_ids.length > 0) {
          content += `- **Featured MCP Clients:** ${post.featured_mcp_client_ids.join(', ')}\n`;
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
              text: `Error fetching post: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
