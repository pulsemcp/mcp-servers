import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { CreatePostParams } from '../types.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  title:
    'Title of the newsletter post (e.g., "Getting Started with MCP Servers", "Claude API Best Practices")',
  body: 'Full HTML body content of the post. Supports standard HTML tags like <h2>, <p>, <ul>, <code>, etc.',
  slug: 'Unique URL-friendly identifier (e.g., "getting-started-mcp-servers", "claude-api-best-practices")',
  author_slug:
    'Slug identifier of the post author (e.g., "sarah-chen", "john-smith"). Use get_authors to find valid slugs',
  category:
    'Post category - "newsletter" for regular newsletter posts, "other" for special content. Default: "newsletter"',
  image_url:
    'URL of the main hero image displayed at the top of the post (e.g., "https://cdn.pulsemcp.com/posts/hero.png")',
  preview_image_url:
    'URL of the preview image shown in post listings (e.g., "https://cdn.pulsemcp.com/posts/preview.png")',
  share_image: 'URL of the image used for social media sharing (Open Graph image)',
  title_tag: 'SEO title tag for search engines. If not provided, defaults to the post title',
  short_title: 'Abbreviated title for navigation or constrained spaces (e.g., "MCP Servers Guide")',
  short_description: 'Brief 1-2 sentence summary shown in post listings and search results',
  description_tag: 'SEO meta description for search engines. Keep under 160 characters',
  last_updated:
    'ISO 8601 date string for when content was last revised (e.g., "2024-01-15T10:30:00Z")',
  table_of_contents: 'JSON structure defining the table of contents with sections and subsections',
  featured_mcp_server_slugs:
    'Array of MCP server slugs to feature in this post (e.g., ["github-mcp", "slack-mcp"])',
  featured_mcp_client_slugs:
    'Array of MCP client slugs to feature in this post (e.g., ["claude-desktop", "cline"])',
} as const;

const DraftNewsletterPostSchema = z.object({
  title: z.string().describe(PARAM_DESCRIPTIONS.title),
  body: z.string().describe(PARAM_DESCRIPTIONS.body),
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
  author_slug: z.string().describe(PARAM_DESCRIPTIONS.author_slug),
  category: z
    .enum(['newsletter', 'other'])
    .optional()
    .default('newsletter')
    .describe(PARAM_DESCRIPTIONS.category),
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

export function draftNewsletterPost(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'draft_newsletter_post',
    description: `Create a new draft newsletter post in the PulseMCP CMS. All posts are created as drafts initially and can be published later through the CMS interface. This tool handles all content fields, SEO metadata, and associations with MCP servers/clients.

Example successful response:
{
  "id": 48,
  "title": "Getting Started with MCP Servers",
  "slug": "getting-started-mcp-servers",
  "status": "draft",
  "category": "newsletter",
  "author": {
    "id": 3,
    "name": "Sarah Chen"
  },
  "created_at": "2024-01-20T15:45:00Z",
  "short_description": "A comprehensive guide to building your first MCP server from scratch"
}

Category meanings:
- newsletter: Regular newsletter posts sent to subscribers
- other: Special content like announcements or one-off articles

Required author_slug:
- Must be a valid author slug from the system
- Use the get_authors tool to find available authors and their slugs
- Common examples: "sarah-chen", "john-smith", "alex-wong"

Use cases:
- Create a new newsletter post about MCP updates or features
- Draft tutorial content for MCP server development
- Write announcement posts for new MCP integrations
- Prepare weekly newsletter content with featured servers/clients
- Create SEO-optimized content with proper metadata
- Save drafts for collaborative review before publishing`,
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title,
        },
        body: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.body,
        },
        slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.slug,
        },
        author_slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.author_slug,
        },
        category: {
          type: 'string',
          enum: ['newsletter', 'other'],
          description: PARAM_DESCRIPTIONS.category,
          default: 'newsletter',
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
      required: ['title', 'body', 'slug', 'author_slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DraftNewsletterPostSchema.parse(args);
      const client = clientFactory();

      try {
        const {
          author_slug,
          featured_mcp_server_slugs,
          featured_mcp_client_slugs,
          ...otherParams
        } = validatedArgs;

        // Look up author by slug
        const author = await client.getAuthorBySlug(author_slug);

        // Always create as draft
        const createParams: CreatePostParams = {
          ...otherParams,
          author_id: author.id,
          status: 'draft' as const,
        };

        // Convert slugs to IDs if provided
        if (featured_mcp_server_slugs) {
          createParams.featured_mcp_server_ids = await Promise.all(
            featured_mcp_server_slugs.map(async (serverSlug) => {
              const server = await client.getMCPServerBySlug(serverSlug);
              return server.id;
            })
          );
        }

        if (featured_mcp_client_slugs) {
          createParams.featured_mcp_client_ids = await Promise.all(
            featured_mcp_client_slugs.map(async (clientSlug) => {
              const mcpClient = await client.getMCPClientBySlug(clientSlug);
              return mcpClient.id;
            })
          );
        }

        const post = await client.createPost(createParams);

        // Format the response for MCP
        let content = `Successfully created draft newsletter post!\n\n`;
        content += `**Title:** ${post.title}\n`;
        content += `**Slug:** ${post.slug}\n`;
        content += `**Status:** ${post.status}\n`;
        content += `**Category:** ${post.category}\n`;

        if (post.author) {
          content += `**Author:** ${post.author.name}\n`;
        }

        content += `**Created:** ${new Date(post.created_at).toLocaleDateString()}\n\n`;

        if (post.short_description) {
          content += `**Summary:** ${post.short_description}\n\n`;
        }

        content += `The draft has been saved and can be edited or published later.`;

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
              text: `Error creating draft post: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
