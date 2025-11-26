import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { SaveMCPImplementationParams } from '../types.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The ID of the MCP implementation to save/update (e.g., 11371)',
  name: 'Updated name of the MCP implementation',
  short_description: 'Updated short description (brief summary)',
  description: 'Updated full description (detailed documentation)',
  type: 'Implementation type - "server" for MCP servers, "client" for MCP clients',
  status: 'Publication status - "draft", "live", or "archived"',
  slug: 'Updated URL-friendly slug identifier',
  url: 'Updated URL to the implementation (GitHub repo, npm package, etc.)',
  provider_name: 'Updated provider/author name',
  github_stars: 'Updated GitHub star count (integer, or null if unknown)',
  classification: 'Implementation classification - "official", "community", or "reference"',
  implementation_language: 'Updated programming language (e.g., "TypeScript", "Python", "Go")',
  mcp_server_id: 'ID of associated MCP server record (null to unlink)',
  mcp_client_id: 'ID of associated MCP client record (null to unlink)',
  // Provider creation/linking
  provider_id:
    'Provider ID: use "new" to create a new provider, or a numeric ID to link an existing one. Required when setting status to "live".',
  provider_slug:
    'URL-friendly provider identifier. Auto-generated from provider_name if omitted. For individuals, prefix with "gh-" (e.g., "gh-username").',
  provider_url:
    'Provider website URL. For companies, use official website. For individuals, use GitHub profile URL.',
  // GitHub repository fields
  github_owner: 'GitHub organization or username that owns the repository.',
  github_repo: 'GitHub repository name (without owner prefix).',
  github_subfolder:
    'Subfolder path within the repository, for monorepos. Omit for root-level projects.',
  // Other fields
  internal_notes:
    'Admin-only notes. Not displayed publicly. Used for tracking submission sources, reviewer comments, etc.',
} as const;

const SaveMCPImplementationSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
  name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  short_description: z.string().optional().describe(PARAM_DESCRIPTIONS.short_description),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
  type: z.enum(['server', 'client']).optional().describe(PARAM_DESCRIPTIONS.type),
  status: z.enum(['draft', 'live', 'archived']).optional().describe(PARAM_DESCRIPTIONS.status),
  slug: z.string().optional().describe(PARAM_DESCRIPTIONS.slug),
  url: z.string().optional().describe(PARAM_DESCRIPTIONS.url),
  provider_name: z.string().optional().describe(PARAM_DESCRIPTIONS.provider_name),
  github_stars: z.number().nullable().optional().describe(PARAM_DESCRIPTIONS.github_stars),
  classification: z
    .enum(['official', 'community', 'reference'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.classification),
  implementation_language: z
    .string()
    .optional()
    .describe(PARAM_DESCRIPTIONS.implementation_language),
  mcp_server_id: z.number().nullable().optional().describe(PARAM_DESCRIPTIONS.mcp_server_id),
  mcp_client_id: z.number().nullable().optional().describe(PARAM_DESCRIPTIONS.mcp_client_id),
  // Provider creation/linking
  provider_id: z
    .union([z.string(), z.number()])
    .optional()
    .describe(PARAM_DESCRIPTIONS.provider_id),
  provider_slug: z.string().optional().describe(PARAM_DESCRIPTIONS.provider_slug),
  provider_url: z.string().optional().describe(PARAM_DESCRIPTIONS.provider_url),
  // GitHub repository fields
  github_owner: z.string().optional().describe(PARAM_DESCRIPTIONS.github_owner),
  github_repo: z.string().optional().describe(PARAM_DESCRIPTIONS.github_repo),
  github_subfolder: z.string().optional().describe(PARAM_DESCRIPTIONS.github_subfolder),
  // Other fields
  internal_notes: z.string().optional().describe(PARAM_DESCRIPTIONS.internal_notes),
});

export function saveMCPImplementation(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'save_mcp_implementation',
    description: `Save/update an MCP implementation by its ID. This tool replicates the "Save Changes" functionality from the PulseMCP Admin panel (e.g., https://admin.pulsemcp.com/mcp_implementations/11371/edit).

This tool allows partial updates - you only need to provide the fields you want to change. All business logic from the Rails controller is applied (validation, associations, callbacks).

Example request:
{
  "id": 11371,
  "name": "GitHub MCP Server",
  "short_description": "Access GitHub repositories and issues via MCP",
  "status": "live",
  "classification": "official",
  "implementation_language": "TypeScript"
}

Example response:
{
  "id": 11371,
  "name": "GitHub MCP Server",
  "slug": "github-mcp-server",
  "type": "server",
  "status": "live",
  "classification": "official",
  "updated_at": "2024-01-20T16:30:00Z"
}

Important notes:
- Only provided fields will be updated; omitted fields remain unchanged
- All Rails controller logic is applied (validations, associations, callbacks)
- Use get_draft_mcp_implementations first to see current values
- The ID parameter is required to identify which implementation to update
- Setting mcp_server_id or mcp_client_id to null will unlink the association

Use cases:
- Update draft implementations before publishing
- Change implementation status (draft → live, live → archived)
- Update metadata (stars, language, classification)
- Link or unlink MCP server/client associations
- Update descriptions and documentation
- Modify URLs and provider information`,
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.id,
        },
        name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.name,
        },
        short_description: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.short_description,
        },
        description: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.description,
        },
        type: {
          type: 'string',
          enum: ['server', 'client'],
          description: PARAM_DESCRIPTIONS.type,
        },
        status: {
          type: 'string',
          enum: ['draft', 'live', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
        slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.slug,
        },
        url: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.url,
        },
        provider_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.provider_name,
        },
        github_stars: {
          type: ['number', 'null'],
          description: PARAM_DESCRIPTIONS.github_stars,
        },
        classification: {
          type: 'string',
          enum: ['official', 'community', 'reference'],
          description: PARAM_DESCRIPTIONS.classification,
        },
        implementation_language: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.implementation_language,
        },
        mcp_server_id: {
          type: ['number', 'null'],
          description: PARAM_DESCRIPTIONS.mcp_server_id,
        },
        mcp_client_id: {
          type: ['number', 'null'],
          description: PARAM_DESCRIPTIONS.mcp_client_id,
        },
        // Provider creation/linking
        provider_id: {
          type: ['string', 'number'],
          description: PARAM_DESCRIPTIONS.provider_id,
        },
        provider_slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.provider_slug,
        },
        provider_url: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.provider_url,
        },
        // GitHub repository fields
        github_owner: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.github_owner,
        },
        github_repo: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.github_repo,
        },
        github_subfolder: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.github_subfolder,
        },
        // Other fields
        internal_notes: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.internal_notes,
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SaveMCPImplementationSchema.parse(args);
      const client = clientFactory();

      try {
        const { id, ...params } = validatedArgs;

        // Only update if there are actual changes
        if (Object.keys(params).length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No changes provided. Please specify at least one field to update.',
              },
            ],
          };
        }

        const updateParams: SaveMCPImplementationParams = params;
        const implementation = await client.saveMCPImplementation(id, updateParams);

        // Format the response for MCP
        let content = `Successfully saved MCP implementation!\n\n`;
        content += `**Name:** ${implementation.name}\n`;
        content += `**ID:** ${implementation.id}\n`;
        content += `**Slug:** ${implementation.slug}\n`;
        content += `**Type:** ${implementation.type}\n`;
        content += `**Status:** ${implementation.status}\n`;

        if (implementation.classification) {
          content += `**Classification:** ${implementation.classification}\n`;
        }

        if (implementation.implementation_language) {
          content += `**Language:** ${implementation.implementation_language}\n`;
        }

        if (implementation.provider_name) {
          content += `**Provider:** ${implementation.provider_name}\n`;
        }

        if (implementation.url) {
          content += `**URL:** ${implementation.url}\n`;
        }

        if (implementation.github_stars !== undefined) {
          content += `**GitHub Stars:** ${implementation.github_stars}\n`;
        }

        if (implementation.mcp_server_id) {
          content += `**Linked MCP Server ID:** ${implementation.mcp_server_id}\n`;
        }

        if (implementation.mcp_client_id) {
          content += `**Linked MCP Client ID:** ${implementation.mcp_client_id}\n`;
        }

        if (implementation.updated_at) {
          content += `**Updated:** ${new Date(implementation.updated_at).toLocaleDateString()}\n`;
        }

        content += `\n**Fields updated:**\n`;
        Object.keys(params).forEach((field) => {
          content += `- ${field}\n`;
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
              text: `Error saving MCP implementation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
