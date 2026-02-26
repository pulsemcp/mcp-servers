import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function getDiscoveredUrlStats(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_discovered_url_stats',
    description: `Get summary statistics for discovered URLs. Returns counts of pending URLs and today's processing breakdown.

Example response:
{
  "pending": 1042,
  "processed_today": 387,
  "posted_today": 42,
  "skipped_today": 330,
  "rejected_today": 12,
  "errored_today": 3
}

Use cases:
- Get a quick overview of the discovered URL processing pipeline
- Monitor how many URLs are pending review
- Generate summary reports of daily processing activity`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const stats = await client.getDiscoveredUrlStats();

        let content = `**Discovered URL Statistics**\n\n`;
        content += `**Pending:** ${stats.pending}\n`;
        content += `**Processed Today:** ${stats.processed_today}\n`;
        content += `**Posted Today:** ${stats.posted_today}\n`;
        content += `**Skipped Today:** ${stats.skipped_today}\n`;
        content += `**Rejected Today:** ${stats.rejected_today}\n`;
        content += `**Errored Today:** ${stats.errored_today}\n`;

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching discovered URL stats: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
