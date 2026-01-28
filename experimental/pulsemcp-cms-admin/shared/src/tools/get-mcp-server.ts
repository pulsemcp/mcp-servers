import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  slug: 'The unique slug identifier of the MCP server (e.g., "filesystem", "github")',
} as const;

const GetMCPServerSchema = z.object({
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
});

export function getMCPServer(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_mcp_server',
    description: `Get detailed information about a specific MCP server by its slug. Returns a unified view that combines data from the underlying MCPImplementation and MCPServer records.

The response includes:
- **Basic info**: name, descriptions, status, classification, implementation language
- **Provider**: organization/person details
- **Source code location**: GitHub repository info with stars and last update
- **Canonical URLs**: authoritative URLs with scope (domain, subdomain, subfolder, url)
- **Remote endpoints**: all deployment endpoints with transport, platform, auth, and cost info
- **Tags**: categorization tags
- **Download statistics**: npm download estimates

**Important fields for updates:**
- \`implementation_id\`: Use this ID when calling \`update_mcp_server\`
- \`slug\`: The server's unique identifier

Example response:
{
  "id": 123,
  "slug": "filesystem",
  "implementation_id": 456,
  "name": "Filesystem MCP Server",
  "short_description": "Access local filesystem securely",
  "description": "Full markdown description...",
  "status": "live",
  "classification": "official",
  "implementation_language": "typescript",
  "url": "https://modelcontextprotocol.io/servers/filesystem",
  "provider": {
    "id": 1,
    "name": "Anthropic",
    "slug": "anthropic",
    "url": "https://anthropic.com"
  },
  "source_code": {
    "github_owner": "modelcontextprotocol",
    "github_repo": "servers",
    "github_subfolder": "src/filesystem",
    "github_stars": 5000
  },
  "canonical_urls": [
    { "url": "https://github.com/modelcontextprotocol/servers", "scope": "subfolder" }
  ],
  "remotes": [
    {
      "id": 1,
      "display_name": "Smithery",
      "url_direct": "https://smithery.ai/...",
      "transport": "sse",
      "host_platform": "smithery",
      "authentication_method": "oauth",
      "cost": "free"
    }
  ]
}`,
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: PARAM_DESCRIPTIONS.slug },
      },
      required: ['slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetMCPServerSchema.parse(args);
      const client = clientFactory();

      try {
        const server = await client.getUnifiedMCPServer(validatedArgs.slug);

        let content = `# ${server.name}\n\n`;
        content += `**Slug:** \`${server.slug}\`\n`;
        if (server.implementation_id !== null) {
          content += `**Implementation ID:** ${server.implementation_id} (use this for updates)\n`;
        } else {
          content += `**Implementation ID:** None (this server has no linked implementation - cannot be updated via mcp_servers tools)\n`;
        }
        content += `**Status:** ${server.status}\n`;

        if (server.classification) {
          content += `**Classification:** ${server.classification}\n`;
        }
        if (server.implementation_language) {
          content += `**Language:** ${server.implementation_language}\n`;
        }
        if (server.url) {
          content += `**URL:** ${server.url}\n`;
        }
        if (server.package_registry || server.package_name) {
          content += `**Package:** ${server.package_registry || 'unknown'}`;
          if (server.package_name) {
            content += ` - ${server.package_name}`;
          }
          content += '\n';
        }
        if (server.recommended !== undefined) {
          content += `**Recommended:** ${server.recommended ? 'Yes' : 'No'}\n`;
        }

        if (server.short_description) {
          content += `\n**Short Description:**\n${server.short_description}\n`;
        }

        if (server.description) {
          content += `\n**Full Description:**\n${server.description}\n`;
        }

        // Provider
        if (server.provider) {
          content += `\n## Provider\n`;
          if (server.provider.name) {
            content += `- **Name:** ${server.provider.name}`;
            if (server.provider.slug) {
              content += ` (${server.provider.slug})`;
            }
            content += '\n';
          }
          if (server.provider.id) {
            content += `- **ID:** ${server.provider.id}\n`;
          }
          if (server.provider.url) {
            content += `- **URL:** ${server.provider.url}\n`;
          }
        }

        // Source code
        if (server.source_code) {
          content += `\n## Source Code\n`;
          if (server.source_code.github_owner && server.source_code.github_repo) {
            let ghUrl = `https://github.com/${server.source_code.github_owner}/${server.source_code.github_repo}`;
            if (server.source_code.github_subfolder) {
              ghUrl += `/tree/main/${server.source_code.github_subfolder}`;
            }
            content += `- **GitHub:** [${server.source_code.github_owner}/${server.source_code.github_repo}](${ghUrl})`;
            if (server.source_code.github_subfolder) {
              content += ` (subfolder: \`${server.source_code.github_subfolder}\`)`;
            }
            content += '\n';
          }
          if (server.source_code.github_stars) {
            content += `- **Stars:** ${server.source_code.github_stars.toLocaleString()}\n`;
          }
          if (server.source_code.github_last_updated) {
            content += `- **Last Updated:** ${server.source_code.github_last_updated}\n`;
          }
          if (server.source_code.github_status) {
            content += `- **Status:** ${server.source_code.github_status}\n`;
          }
        }

        // Canonical URLs
        if (server.canonical_urls && server.canonical_urls.length > 0) {
          content += `\n## Canonical URLs\n`;
          for (const canonical of server.canonical_urls) {
            content += `- **${canonical.scope}:** ${canonical.url}`;
            if (canonical.note) {
              content += ` (${canonical.note})`;
            }
            content += '\n';
          }
        }

        // Remote endpoints
        if (server.remotes && server.remotes.length > 0) {
          content += `\n## Remote Endpoints (${server.remotes.length})\n`;
          for (const [idx, remote] of server.remotes.entries()) {
            content += `\n### ${idx + 1}. ${remote.display_name || 'Endpoint'}`;
            if (remote.id) {
              content += ` (ID: ${remote.id})`;
            }
            content += '\n';

            if (remote.url_direct) {
              content += `- **Direct URL:** ${remote.url_direct}\n`;
            }
            if (remote.url_setup) {
              content += `- **Setup URL:** ${remote.url_setup}\n`;
            }
            if (remote.transport) {
              content += `- **Transport:** ${remote.transport}\n`;
            }
            if (remote.host_platform) {
              content += `- **Platform:** ${remote.host_platform}\n`;
            }
            if (remote.host_infrastructure) {
              content += `- **Infrastructure:** ${remote.host_infrastructure}\n`;
            }
            if (remote.authentication_method) {
              content += `- **Auth:** ${remote.authentication_method}\n`;
            }
            if (remote.cost) {
              content += `- **Cost:** ${remote.cost}\n`;
            }
            if (remote.status) {
              content += `- **Status:** ${remote.status}\n`;
            }
          }
        }

        // Tags
        if (server.tags && server.tags.length > 0) {
          content += `\n## Tags\n`;
          content += server.tags.map((t) => `\`${t.name}\``).join(', ') + '\n';
        }

        // Download stats
        if (server.downloads_estimate_total || server.downloads_estimate_last_30_days) {
          content += `\n## Download Statistics\n`;
          if (server.downloads_estimate_total) {
            content += `- **Total:** ${server.downloads_estimate_total.toLocaleString()}\n`;
          }
          if (server.downloads_estimate_last_30_days) {
            content += `- **Last 30 days:** ${server.downloads_estimate_last_30_days.toLocaleString()}\n`;
          }
          if (server.downloads_estimate_last_7_days) {
            content += `- **Last 7 days:** ${server.downloads_estimate_last_7_days.toLocaleString()}\n`;
          }
        }

        // Internal notes
        if (server.internal_notes) {
          content += `\n## Internal Notes\n${server.internal_notes}\n`;
        }

        // Timestamps
        content += `\n## Timestamps\n`;
        if (server.created_at) {
          content += `- **Created:** ${server.created_at}\n`;
        }
        if (server.updated_at) {
          content += `- **Updated:** ${server.updated_at}\n`;
        }
        if (server.created_on_override) {
          content += `- **Created On Override:** ${server.created_on_override}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching MCP server: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
