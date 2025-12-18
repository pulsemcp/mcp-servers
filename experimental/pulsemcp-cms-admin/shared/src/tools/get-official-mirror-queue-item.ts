import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  id: 'The numeric ID of the official mirror queue entry to retrieve',
} as const;

const GetOfficialMirrorQueueItemSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
});

export function getOfficialMirrorQueueItem(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_official_mirror_queue_item',
    description: `Retrieve full details of a single official mirror queue entry by ID. Returns complete information including all mirror versions and linked server details.

This tool provides comprehensive information about an official mirror queue entry, including:
- Queue item metadata (name, status, timestamps)
- All mirror versions with complete server.json data
- Linked MCP server details (if linked)
- Server linkage consistency status

The response includes all fields from the server.json submissions:
- Name, version, description
- GitHub repository URL
- Website URL
- Categories and license
- Remote endpoints (hosted versions)
- Package information (npm, pip, etc.)
- Schema version and ingestion metadata

Use cases:
- Review complete details of a queue entry before taking action
- Compare mirror versions to see changes over time
- Check linked server details and linkage consistency
- Access full server.json data for decision making
- Verify remote endpoints and package information`,
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
      const validatedArgs = GetOfficialMirrorQueueItemSchema.parse(args);
      const client = clientFactory();

      try {
        const item = await client.getOfficialMirrorQueueItem(validatedArgs.id);

        // Format the response for MCP
        let content = `# Official Mirror Queue Item: ${item.name}\n\n`;
        content += `**ID:** ${item.id}\n`;
        content += `**Status:** ${item.status}\n`;
        content += `**Mirrors Count:** ${item.mirrors_count}\n`;
        content += `**Server Linkage Consistent:** ${item.server_linkage_consistent ? 'Yes' : 'No'}\n`;

        if (item.created_at) {
          content += `**Created:** ${new Date(item.created_at).toLocaleString()}\n`;
        }
        if (item.updated_at) {
          content += `**Updated:** ${new Date(item.updated_at).toLocaleString()}\n`;
        }

        // Linked server details
        if (item.linked_server) {
          content += `\n## Linked MCP Server\n\n`;
          content += `- **Slug:** ${item.linked_server.slug}\n`;
          content += `- **ID:** ${item.linked_server.id}\n`;
          if (item.linked_server.classification) {
            content += `- **Classification:** ${item.linked_server.classification}\n`;
          }
          if (item.linked_server.implementation_language) {
            content += `- **Language:** ${item.linked_server.implementation_language}\n`;
          }
          if (item.linked_server.provider_name) {
            content += `- **Provider:** ${item.linked_server.provider_name}`;
            if (item.linked_server.provider_slug) {
              content += ` (${item.linked_server.provider_slug})`;
            }
            content += '\n';
          }
          if (item.linked_server.implementation_name) {
            content += `- **Implementation:** ${item.linked_server.implementation_name}`;
            if (item.linked_server.implementation_status) {
              content += ` (${item.linked_server.implementation_status})`;
            }
            content += '\n';
          }
        } else {
          content += `\n## Linked MCP Server\n\nNo server linked.\n`;
        }

        // Mirrors (versions)
        content += `\n## Mirrors (${item.mirrors.length} versions)\n\n`;

        for (const [index, mirror] of item.mirrors.entries()) {
          content += `### ${index + 1}. ${mirror.name} v${mirror.version}\n\n`;
          content += `- **ID:** ${mirror.id}\n`;
          content += `- **Official Version ID:** ${mirror.official_version_id}\n`;

          if (mirror.description) {
            content += `- **Description:** ${mirror.description}\n`;
          }
          if (mirror.github_url) {
            content += `- **GitHub:** ${mirror.github_url}\n`;
          }
          if (mirror.website_url) {
            content += `- **Website:** ${mirror.website_url}\n`;
          }
          if (mirror.license) {
            content += `- **License:** ${mirror.license}\n`;
          }
          if (mirror.categories && mirror.categories.length > 0) {
            content += `- **Categories:** ${mirror.categories.join(', ')}\n`;
          }
          if (mirror.schema_version) {
            content += `- **Schema Version:** ${mirror.schema_version}\n`;
          }
          if (mirror.published_at) {
            content += `- **Published:** ${new Date(mirror.published_at).toLocaleString()}\n`;
          }
          if (mirror.datetime_ingested) {
            content += `- **Ingested:** ${new Date(mirror.datetime_ingested).toLocaleString()}\n`;
          }

          // Remotes
          if (mirror.remotes && Array.isArray(mirror.remotes) && mirror.remotes.length > 0) {
            content += `- **Remotes:** ${mirror.remotes.length} endpoint(s)\n`;
            for (const remote of mirror.remotes) {
              if (typeof remote === 'object' && remote !== null) {
                const r = remote as Record<string, unknown>;
                content += `  - ${r.transportType || 'unknown'}: ${r.url || 'no URL'}\n`;
              }
            }
          }

          // Packages
          if (mirror.packages && Array.isArray(mirror.packages) && mirror.packages.length > 0) {
            content += `- **Packages:** ${mirror.packages.length} package(s)\n`;
            for (const pkg of mirror.packages) {
              if (typeof pkg === 'object' && pkg !== null) {
                const p = pkg as Record<string, unknown>;
                content += `  - ${p.registry || 'unknown'}: ${p.name || 'no name'}\n`;
              }
            }
          }

          content += '\n';
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
              text: `Error fetching official mirror queue item: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
