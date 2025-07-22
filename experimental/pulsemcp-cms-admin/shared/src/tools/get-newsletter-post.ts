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
    description: `Retrieve complete details for a specific newsletter post by its unique slug identifier. This tool returns the full HTML content, metadata, SEO fields, and all associated information for a single post.

Example response:
{
  "id": 42,
  "title": "Introducing the Claude MCP Protocol",
  "slug": "introducing-claude-mcp-protocol",
  "body": "<h2>What is MCP?</h2><p>The Model Context Protocol (MCP) is a new standard...</p>",
  "status": "live",
  "category": "newsletter",
  "author": {
    "id": 1,
    "name": "Sarah Chen"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z",
  "short_description": "Learn about the new Model Context Protocol and how it enables powerful AI integrations",
  "image_url": "https://cdn.pulsemcp.com/posts/mcp-intro/hero.png",
  "preview_image_url": "https://cdn.pulsemcp.com/posts/mcp-intro/preview.png",
  "share_image": "https://cdn.pulsemcp.com/posts/mcp-intro/social.png",
  "title_tag": "Introducing Claude MCP Protocol - PulseMCP Newsletter",
  "description_tag": "Discover the Model Context Protocol (MCP) and learn how to build powerful AI integrations with Claude",
  "featured_mcp_server_ids": [12, 15, 18],
  "featured_mcp_client_ids": [3, 7]
}

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
          content += `**Author:** ${post.author.name}\n`;
        }

        content += `**Created:** ${new Date(post.created_at).toLocaleDateString()}\n`;
        content += `**Updated:** ${new Date(post.updated_at).toLocaleDateString()}\n\n`;

        if (post.short_description) {
          content += `**Summary:** ${post.short_description}\n\n`;
        }

        if (post.body) {
          content += `## Content\n\n${post.body}\n\n`;
        } else {
          content += `## Content\n\n*Content not available in preview*\n\n`;
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
