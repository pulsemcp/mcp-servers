import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  status:
    'Filter by status: "pending" (default, includes both pending_new and pending_update), "pending_new", "pending_update", "approved", or "rejected"',
  q: 'Search query to filter by name, GitHub URL, or website URL',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const GetOfficialMirrorQueueItemsSchema = z.object({
  status: z
    .enum(['pending', 'pending_new', 'pending_update', 'approved', 'rejected'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function getOfficialMirrorQueueItems(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_official_mirror_queue_items',
    description: `Retrieve a paginated list of official mirror queue entries from the PulseMCP Admin panel. Returns formatted markdown with queue item details, status, and linked server information.

The official mirror queue contains entries from the MCP Registry's official server.json submissions. These are servers that have been submitted through the official MCP Registry process and need to be reviewed, linked to existing MCP servers, or converted to draft implementations.

The response is formatted as markdown with:
- Total count and pagination info
- List of queue items, each showing:
  - Name and ID
  - Status (pending_new, pending_update, approved, rejected)
  - Number of mirrors (version snapshots)
  - Linked server slug and ID (if linked)
  - Latest mirror summary (name, version, description, URLs)
  - Created and updated dates

Use cases:
- Review pending official mirror submissions that need action
- Find specific queue items by searching name or URLs
- Check approved or rejected entries for reference
- Monitor the official queue for new submissions
- Filter by status to focus on specific workflow stages`,
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'pending_new', 'pending_update', 'approved', 'rejected'],
          description: PARAM_DESCRIPTIONS.status,
        },
        q: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.q,
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.limit,
        },
        offset: {
          type: 'number',
          minimum: 0,
          description: PARAM_DESCRIPTIONS.offset,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetOfficialMirrorQueueItemsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getOfficialMirrorQueueItems(validatedArgs);

        // Format the response for MCP
        let content = `Found ${response.items.length} official mirror queue items`;

        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }

        content += ':\n\n';

        for (const [index, item] of response.items.entries()) {
          content += `${index + 1}. **${item.name}** (ID: ${item.id})\n`;
          content += `   Status: ${item.status} | Mirrors: ${item.mirrors_count}\n`;

          if (item.linked_server_slug) {
            content += `   Linked Server: ${item.linked_server_slug} (ID: ${item.linked_server_id})\n`;
          }

          if (item.latest_mirror) {
            content += `   Latest Mirror:\n`;
            content += `     - Name: ${item.latest_mirror.name}\n`;
            content += `     - Version: ${item.latest_mirror.version}\n`;
            if (item.latest_mirror.description) {
              content += `     - Description: ${item.latest_mirror.description}\n`;
            }
            if (item.latest_mirror.github_url) {
              content += `     - GitHub: ${item.latest_mirror.github_url}\n`;
            }
            if (item.latest_mirror.website_url) {
              content += `     - Website: ${item.latest_mirror.website_url}\n`;
            }
            if (item.latest_mirror.published_at) {
              content += `     - Published: ${new Date(item.latest_mirror.published_at).toLocaleDateString()}\n`;
            }
          }

          if (item.created_at) {
            content += `   Created: ${new Date(item.created_at).toLocaleDateString()}\n`;
          }

          if (item.updated_at) {
            content += `   Updated: ${new Date(item.updated_at).toLocaleDateString()}\n`;
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
              text: `Error fetching official mirror queue items: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
