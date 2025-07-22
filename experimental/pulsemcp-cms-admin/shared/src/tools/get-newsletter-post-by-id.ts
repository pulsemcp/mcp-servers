import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { getPostById } from '../pulsemcp-admin-client/pulsemcp-admin-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the post to retrieve (e.g., 123, 456)',
} as const;

const GetNewsletterPostByIdSchema = z.object({
  id: z.number().int().positive().describe(PARAM_DESCRIPTIONS.id),
});

export function getNewsletterPostById(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_newsletter_post_by_id',
    description: `Retrieve complete details for a specific newsletter post by its numeric ID using the supervisor endpoint. This tool returns the full content, metadata, SEO fields, and all associated information for a single post.

This is useful when you have a numeric post ID (e.g., from another API response) and need to fetch the full post details.

Example response:
{
  "id": 42,
  "title": "Introducing the Claude MCP Protocol",
  "slug": "introducing-claude-mcp-protocol",
  "body": "<h2>What is MCP?</h2><p>The Model Context Protocol (MCP) is...</p>",
  "status": "live",
  "category": "newsletter",
  "author": {
    "id": 1,
    "name": "Sarah Chen"
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z",
  "short_description": "Learn about the new Model Context Protocol",
  "image_url": "https://cdn.pulsemcp.com/posts/mcp-intro/hero.png",
  "featured_mcp_server_ids": [12, 15, 18],
  "featured_mcp_client_ids": [3, 7]
}

Use cases:
- Retrieve a post when you only have its numeric ID
- Access posts through supervisor endpoints for enhanced permissions
- Fetch post details from external systems that reference posts by ID`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.id,
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetNewsletterPostByIdSchema.parse(args);
      const client = clientFactory();

      // Get API key and base URL from the client
      const apiKey =
        (client as { apiKey?: string }).apiKey || process.env.PULSEMCP_ADMIN_API_KEY || '';
      const baseUrl = (client as { baseUrl?: string }).baseUrl || 'https://admin.pulsemcp.com';

      try {
        const post = await getPostById(apiKey, baseUrl, validatedArgs.id);

        // Format the response for MCP
        let content = `# ${post.title}\n\n`;
        content += `**ID:** ${post.id} | **Slug:** ${post.slug}\n`;
        content += `**Status:** ${post.status} | **Category:** ${post.category}\n`;

        if (post.author) {
          content += `**Author:** ${post.author.name}\n`;
        }

        content += `**Created:** ${new Date(post.created_at).toLocaleDateString()}\n`;
        content += `**Updated:** ${new Date(post.updated_at).toLocaleDateString()}\n\n`;

        if (post.short_description) {
          content += `**Summary:** ${post.short_description}\n\n`;
        }

        content += `## Content\n\n${post.body}\n\n`;

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
              text: `Error fetching post by ID: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
