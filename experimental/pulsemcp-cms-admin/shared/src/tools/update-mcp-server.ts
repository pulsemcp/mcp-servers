import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  implementation_id:
    'The implementation ID of the MCP server to update (get this from get_mcp_server or list_mcp_servers)',
  name: 'Display name of the server',
  short_description: 'Brief one-line description',
  description: 'Full markdown description',
  status: 'Publication status: draft, live, or archived',
  classification: 'Server classification: official, community, or reference',
  implementation_language: 'Primary implementation language (e.g., typescript, python)',
  url: 'Marketing/landing page URL for the server',
  provider_id:
    'ID of existing provider to link, or "new" to create a new provider (requires provider_name)',
  provider_name: 'Name for new provider (when provider_id is "new")',
  provider_slug: 'URL slug for provider (auto-generated from name if omitted)',
  provider_url: 'Website URL for provider',
  source_code: 'GitHub repository information',
  package_registry: 'Package registry: npm, pypi, cargo, etc.',
  package_name: 'Package name on the registry (e.g., "@modelcontextprotocol/server-filesystem")',
  recommended: 'Mark this server as recommended by PulseMCP',
  created_on_override:
    'Override the automatically derived created date (ISO date string, e.g., "2025-01-15")',
  tags: 'Tags for the server. Replaces all existing tags when provided. Use tag slugs.',
  canonical_urls:
    'Authoritative URLs for the server. Replaces all existing canonical URLs when provided.',
  remotes: 'Remote endpoints for the server. Replaces all existing remotes when provided.',
  internal_notes: 'Admin-only internal notes',
} as const;

const CanonicalUrlSchema = z.object({
  url: z.string().describe('The canonical URL'),
  scope: z
    .enum(['domain', 'subdomain', 'subfolder', 'url'])
    .describe('Scope of the canonical: domain, subdomain, subfolder, or url (exact match)'),
  note: z.string().optional().describe('Optional note about this canonical URL'),
});

const RemoteEndpointSchema = z.object({
  id: z.number().optional().describe('ID of existing remote endpoint to update (omit for new)'),
  display_name: z.string().optional().describe('Display name for this endpoint'),
  url_direct: z.string().optional().describe('Direct API endpoint URL'),
  url_setup: z.string().optional().describe('Setup/configuration URL'),
  transport: z
    .string()
    .optional()
    .describe('Transport protocol: sse, streamable_http, stdio, etc.'),
  host_platform: z
    .string()
    .optional()
    .describe('Hosting platform: smithery, superinterface, glama, etc.'),
  host_infrastructure: z
    .string()
    .optional()
    .describe('Infrastructure provider: cloudflare, vercel, fly_io, etc.'),
  authentication_method: z.string().optional().describe('Auth method: open, oauth, api_key, etc.'),
  cost: z.string().optional().describe('Cost tier: free, free_tier, paid, etc.'),
  status: z.string().optional().describe('Endpoint status: live, draft'),
  internal_notes: z.string().optional().describe('Internal notes about this endpoint'),
});

const SourceCodeSchema = z.object({
  github_owner: z.string().optional().describe('GitHub organization or username'),
  github_repo: z.string().optional().describe('GitHub repository name'),
  github_subfolder: z.string().optional().describe('Subfolder within repo (for monorepos)'),
});

const UpdateMCPServerSchema = z.object({
  implementation_id: z.number().describe(PARAM_DESCRIPTIONS.implementation_id),
  name: z.string().optional().describe(PARAM_DESCRIPTIONS.name),
  short_description: z.string().optional().describe(PARAM_DESCRIPTIONS.short_description),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
  status: z.enum(['draft', 'live', 'archived']).optional().describe(PARAM_DESCRIPTIONS.status),
  classification: z
    .enum(['official', 'community', 'reference'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.classification),
  implementation_language: z
    .string()
    .optional()
    .describe(PARAM_DESCRIPTIONS.implementation_language),
  url: z.string().optional().describe(PARAM_DESCRIPTIONS.url),
  provider_id: z
    .union([z.number(), z.string()])
    .optional()
    .describe(PARAM_DESCRIPTIONS.provider_id),
  provider_name: z.string().optional().describe(PARAM_DESCRIPTIONS.provider_name),
  provider_slug: z.string().optional().describe(PARAM_DESCRIPTIONS.provider_slug),
  provider_url: z.string().optional().describe(PARAM_DESCRIPTIONS.provider_url),
  source_code: SourceCodeSchema.optional().describe(PARAM_DESCRIPTIONS.source_code),
  package_registry: z.string().optional().describe(PARAM_DESCRIPTIONS.package_registry),
  package_name: z.string().optional().describe(PARAM_DESCRIPTIONS.package_name),
  recommended: z.boolean().optional().describe(PARAM_DESCRIPTIONS.recommended),
  created_on_override: z.string().optional().describe(PARAM_DESCRIPTIONS.created_on_override),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
  canonical_urls: z
    .array(CanonicalUrlSchema)
    .optional()
    .describe(PARAM_DESCRIPTIONS.canonical_urls),
  remotes: z.array(RemoteEndpointSchema).optional().describe(PARAM_DESCRIPTIONS.remotes),
  internal_notes: z.string().optional().describe(PARAM_DESCRIPTIONS.internal_notes),
});

export function updateMCPServer(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_mcp_server',
    description: `Update an MCP server's information. Only provided fields will be updated.

**Important:** Use the \`implementation_id\` from \`get_mcp_server\` or \`list_mcp_servers\`, NOT the server ID or slug.

## Updating Basic Info
\`\`\`json
{
  "implementation_id": 456,
  "name": "New Name",
  "short_description": "Updated description",
  "status": "live"
}
\`\`\`

## Updating Source Code Location
\`\`\`json
{
  "implementation_id": 456,
  "source_code": {
    "github_owner": "modelcontextprotocol",
    "github_repo": "servers",
    "github_subfolder": "src/filesystem"
  }
}
\`\`\`

## Adding/Updating Canonical URLs
Providing canonical_urls replaces ALL existing canonical URLs:
\`\`\`json
{
  "implementation_id": 456,
  "canonical_urls": [
    { "url": "https://github.com/org/repo", "scope": "subfolder" },
    { "url": "https://npmjs.com/package/name", "scope": "url" }
  ]
}
\`\`\`

## Adding/Updating Remote Endpoints
Providing remotes replaces ALL existing remote endpoints:
\`\`\`json
{
  "implementation_id": 456,
  "remotes": [
    {
      "display_name": "Smithery",
      "url_direct": "https://smithery.ai/server/...",
      "transport": "sse",
      "host_platform": "smithery",
      "authentication_method": "oauth",
      "cost": "free"
    }
  ]
}
\`\`\`

To update an existing remote, include its ID:
\`\`\`json
{
  "implementation_id": 456,
  "remotes": [
    { "id": 123, "cost": "paid" },
    { "display_name": "New Endpoint", "url_direct": "https://..." }
  ]
}
\`\`\`

## Linking/Creating Provider
Link existing provider by ID:
\`\`\`json
{ "implementation_id": 456, "provider_id": 123 }
\`\`\`

Create new provider:
\`\`\`json
{
  "implementation_id": 456,
  "provider_id": "new",
  "provider_name": "Acme Corp",
  "provider_url": "https://acme.com"
}
\`\`\``,
    inputSchema: {
      type: 'object',
      properties: {
        implementation_id: { type: 'number', description: PARAM_DESCRIPTIONS.implementation_id },
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
        short_description: { type: 'string', description: PARAM_DESCRIPTIONS.short_description },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
        status: {
          type: 'string',
          enum: ['draft', 'live', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
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
        url: { type: 'string', description: PARAM_DESCRIPTIONS.url },
        provider_id: {
          oneOf: [{ type: 'number' }, { type: 'string' }],
          description: PARAM_DESCRIPTIONS.provider_id,
        },
        provider_name: { type: 'string', description: PARAM_DESCRIPTIONS.provider_name },
        provider_slug: { type: 'string', description: PARAM_DESCRIPTIONS.provider_slug },
        provider_url: { type: 'string', description: PARAM_DESCRIPTIONS.provider_url },
        source_code: {
          type: 'object',
          properties: {
            github_owner: { type: 'string', description: 'GitHub organization or username' },
            github_repo: { type: 'string', description: 'GitHub repository name' },
            github_subfolder: {
              type: 'string',
              description: 'Subfolder within repo (for monorepos)',
            },
          },
          description: PARAM_DESCRIPTIONS.source_code,
        },
        package_registry: { type: 'string', description: PARAM_DESCRIPTIONS.package_registry },
        package_name: { type: 'string', description: PARAM_DESCRIPTIONS.package_name },
        recommended: { type: 'boolean', description: PARAM_DESCRIPTIONS.recommended },
        created_on_override: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.created_on_override,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
        canonical_urls: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'The canonical URL' },
              scope: {
                type: 'string',
                enum: ['domain', 'subdomain', 'subfolder', 'url'],
                description: 'Scope of the canonical',
              },
              note: { type: 'string', description: 'Optional note' },
            },
            required: ['url', 'scope'],
          },
          description: PARAM_DESCRIPTIONS.canonical_urls,
        },
        remotes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'ID of existing remote to update' },
              display_name: { type: 'string', description: 'Display name' },
              url_direct: { type: 'string', description: 'Direct API endpoint URL' },
              url_setup: { type: 'string', description: 'Setup URL' },
              transport: { type: 'string', description: 'Transport: sse, streamable_http, etc.' },
              host_platform: { type: 'string', description: 'Platform: smithery, superinterface' },
              host_infrastructure: {
                type: 'string',
                description: 'Infrastructure: cloudflare, vercel',
              },
              authentication_method: { type: 'string', description: 'Auth: open, oauth, api_key' },
              cost: { type: 'string', description: 'Cost: free, free_tier, paid' },
              status: { type: 'string', description: 'Status: live, draft' },
              internal_notes: { type: 'string', description: 'Internal notes' },
            },
          },
          description: PARAM_DESCRIPTIONS.remotes,
        },
        internal_notes: { type: 'string', description: PARAM_DESCRIPTIONS.internal_notes },
      },
      required: ['implementation_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UpdateMCPServerSchema.parse(args);
      const client = clientFactory();

      try {
        const { implementation_id, ...updateParams } = validatedArgs;

        // Check if there are any fields to update
        const hasUpdates = Object.keys(updateParams).length > 0;
        if (!hasUpdates) {
          return {
            content: [
              {
                type: 'text',
                text: 'No changes provided. Please specify at least one field to update.',
              },
            ],
          };
        }

        const server = await client.updateUnifiedMCPServer(implementation_id, updateParams);

        let content = `Successfully updated MCP server!\n\n`;
        content += `**Name:** ${server.name}\n`;
        content += `**Slug:** \`${server.slug}\`\n`;
        content += `**Implementation ID:** ${server.implementation_id}\n`;
        content += `**Status:** ${server.status}\n`;

        if (server.classification) {
          content += `**Classification:** ${server.classification}\n`;
        }

        if (server.provider?.name) {
          content += `**Provider:** ${server.provider.name}\n`;
        }

        if (server.source_code?.github_owner && server.source_code?.github_repo) {
          content += `**GitHub:** ${server.source_code.github_owner}/${server.source_code.github_repo}`;
          if (server.source_code.github_subfolder) {
            content += `/${server.source_code.github_subfolder}`;
          }
          content += '\n';
        }

        if (server.canonical_urls && server.canonical_urls.length > 0) {
          content += `**Canonical URLs:** ${server.canonical_urls.length}\n`;
        }

        if (server.remotes && server.remotes.length > 0) {
          content += `**Remote Endpoints:** ${server.remotes.length}\n`;
        }

        if (server.updated_at) {
          content += `**Updated:** ${server.updated_at}\n`;
        }

        content += `\n**Fields updated:**\n`;
        Object.keys(updateParams).forEach((field) => {
          content += `- ${field}\n`;
        });

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating MCP server: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
