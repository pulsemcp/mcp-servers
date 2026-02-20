import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function getGoodJobStatistics(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_good_job_statistics',
    description: `Retrieve GoodJob statistics. Returns aggregate counts of jobs by status.

Example response:
{
  "total": 1000,
  "finished": 950,
  "queued": 10,
  "running": 5,
  "scheduled": 20,
  "retried": 5,
  "discarded": 8,
  "error": 2
}

Use cases:
- Get an overview of background job health
- Monitor job queue depth
- Check for elevated error or discard rates`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const stats = await client.getGoodJobStatistics();

        let content = `**GoodJob Statistics**\n\n`;
        content += `**Total Jobs:** ${stats.total}\n`;
        content += `**Finished:** ${stats.finished}\n`;
        content += `**Queued:** ${stats.queued}\n`;
        content += `**Running:** ${stats.running}\n`;
        content += `**Scheduled:** ${stats.scheduled}\n`;
        content += `**Retried:** ${stats.retried}\n`;
        content += `**Discarded:** ${stats.discarded}\n`;
        content += `**Error:** ${stats.error}\n`;

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching statistics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
