import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { UpdatePostParams } from '../types.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  slug: 'The unique slug identifier for the post to update (e.g., "getting-started-mcp-servers")',
  title: 'Updated title of the newsletter post',
  body: 'Updated HTML body content. Supports standard HTML tags',
  category: 'Post category - "newsletter" for regular posts, "other" for special content',
  image_url: 'Updated URL of the main hero image',
  preview_image_url: 'Updated URL of the preview image for listings',
  share_image: 'Updated URL of the social media sharing image',
  title_tag: 'Updated SEO title tag for search engines',
  short_title: 'Updated abbreviated title for navigation',
  short_description: 'Updated brief summary for listings and search results',
  description_tag: 'Updated SEO meta description (keep under 160 characters)',
  last_updated: 'ISO 8601 date string for content revision timestamp',
  table_of_contents: 'Updated table of contents - can be HTML string or JSON structure',
  featured_mcp_server_slugs: 'Updated array of MCP server slugs to feature (replaces existing)',
  featured_mcp_client_slugs: 'Updated array of MCP client slugs to feature (replaces existing)',
} as const;

const UpdateNewsletterPostSchema = z.object({
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  body: z.string().optional().describe(PARAM_DESCRIPTIONS.body),
  category: z.enum(['newsletter', 'other']).optional().describe(PARAM_DESCRIPTIONS.category),
  image_url: z.string().optional().describe(PARAM_DESCRIPTIONS.image_url),
  preview_image_url: z.string().optional().describe(PARAM_DESCRIPTIONS.preview_image_url),
  share_image: z.string().optional().describe(PARAM_DESCRIPTIONS.share_image),
  title_tag: z.string().optional().describe(PARAM_DESCRIPTIONS.title_tag),
  short_title: z.string().optional().describe(PARAM_DESCRIPTIONS.short_title),
  short_description: z.string().optional().describe(PARAM_DESCRIPTIONS.short_description),
  description_tag: z.string().optional().describe(PARAM_DESCRIPTIONS.description_tag),
  last_updated: z.string().optional().describe(PARAM_DESCRIPTIONS.last_updated),
  table_of_contents: z.any().optional().describe(PARAM_DESCRIPTIONS.table_of_contents),
  featured_mcp_server_slugs: z
    .array(z.string())
    .optional()
    .describe(PARAM_DESCRIPTIONS.featured_mcp_server_slugs),
  featured_mcp_client_slugs: z
    .array(z.string())
    .optional()
    .describe(PARAM_DESCRIPTIONS.featured_mcp_client_slugs),
});

export function updateNewsletterPost(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_newsletter_post',
    description: `Update an existing newsletter post's content and metadata by its slug. This tool allows partial updates - you only need to provide the fields you want to change. The post's status cannot be modified through this API.

Example request:
{
  "slug": "getting-started-mcp-servers",
  "title": "Getting Started with MCP Servers - Updated Guide",
  "short_description": "An updated comprehensive guide to building your first MCP server",
  "featured_mcp_server_slugs": ["github-mcp", "slack-mcp", "notion-mcp"]
}

Example response:
{
  "id": 48,
  "title": "Getting Started with MCP Servers - Updated Guide",
  "slug": "getting-started-mcp-servers",
  "status": "draft",  // Status remains unchanged
  "category": "newsletter",
  "updated_at": "2024-01-20T16:30:00Z",
  "short_description": "An updated comprehensive guide to building your first MCP server"
}

Important notes:
- Only provided fields will be updated; omitted fields remain unchanged
- Status cannot be modified - posts keep their current draft/live status
- Featured server/client arrays completely replace existing associations
- Use get_newsletter_post first to see current values before updating

Use cases:
- Fix typos or update content in existing posts
- Update SEO metadata for better search visibility
- Change featured MCP servers/clients as new ones become available
- Update images after uploading new versions
- Refresh content with latest information
- Add or modify the table of contents structure`,
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.slug,
        },
        title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title,
        },
        body: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.body,
        },
        category: {
          type: 'string',
          enum: ['newsletter', 'other'],
          description: PARAM_DESCRIPTIONS.category,
        },
        image_url: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.image_url,
        },
        preview_image_url: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.preview_image_url,
        },
        share_image: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.share_image,
        },
        title_tag: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title_tag,
        },
        short_title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.short_title,
        },
        short_description: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.short_description,
        },
        description_tag: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.description_tag,
        },
        last_updated: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.last_updated,
        },
        table_of_contents: {
          description: PARAM_DESCRIPTIONS.table_of_contents,
        },
        featured_mcp_server_slugs: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: PARAM_DESCRIPTIONS.featured_mcp_server_slugs,
        },
        featured_mcp_client_slugs: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: PARAM_DESCRIPTIONS.featured_mcp_client_slugs,
        },
      },
      required: ['slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UpdateNewsletterPostSchema.parse(args);
      const client = clientFactory();

      try {
        const { slug, featured_mcp_server_slugs, featured_mcp_client_slugs, ...otherParams } =
          validatedArgs;

        // Only update if there are actual changes
        if (Object.keys(validatedArgs).length <= 1) {
          // Only slug provided
          return {
            content: [
              {
                type: 'text',
                text: 'No changes provided. Please specify at least one field to update.',
              },
            ],
          };
        }

        // Convert slugs to IDs if provided
        const updateParams: UpdatePostParams = { ...otherParams };

        if (featured_mcp_server_slugs) {
          updateParams.featured_mcp_server_ids = await Promise.all(
            featured_mcp_server_slugs.map(async (serverSlug) => {
              const server = await client.getMCPServerBySlug(serverSlug);
              return server.id;
            })
          );
        }

        if (featured_mcp_client_slugs) {
          updateParams.featured_mcp_client_ids = await Promise.all(
            featured_mcp_client_slugs.map(async (clientSlug) => {
              const mcpClient = await client.getMCPClientBySlug(clientSlug);
              return mcpClient.id;
            })
          );
        }

        const post = await client.updatePost(slug, updateParams);

        // Format the response for MCP
        let content = `Successfully updated newsletter post!\n\n`;
        content += `**Title:** ${post.title}\n`;
        content += `**Slug:** ${post.slug}\n`;
        content += `**Status:** ${post.status}\n`;
        content += `**Category:** ${post.category}\n`;

        if (post.author) {
          content += `**Author:** ${post.author.name}\n`;
        }

        content += `**Updated:** ${new Date(post.updated_at).toLocaleDateString()}\n\n`;

        // Show what was updated
        content += `**Fields updated:**\n`;
        Object.keys(validatedArgs).forEach((field) => {
          if (field !== 'slug') {
            // Show user-friendly field names
            if (field === 'featured_mcp_server_slugs') {
              content += `- featured_mcp_servers (converted from slugs)\n`;
            } else if (field === 'featured_mcp_client_slugs') {
              content += `- featured_mcp_clients (converted from slugs)\n`;
            } else {
              content += `- ${field}\n`;
            }
          }
        });

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating post: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
