import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function getGoodJobQueueStatistics(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_good_job_queue_statistics',
    description: `Retrieve aggregate statistics for GoodJob background jobs. Returns counts of jobs grouped by status.

Example response:
{
  "total": 1500,
  "scheduled": 10,
  "queued": 5,
  "running": 3,
  "succeeded": 1400,
  "failed": 50,
  "discarded": 32
}

Use cases:
- Get a high-level overview of job processing health
- Monitor failure rates
- Check for jobs stuck in queued or running states`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const stats = await client.getGoodJobStatistics();

        let content = `**GoodJob Queue Statistics**\n\n`;
        content += `**Total Jobs:** ${stats.total}\n`;
        content += `**Scheduled:** ${stats.scheduled}\n`;
        content += `**Queued:** ${stats.queued}\n`;
        content += `**Running:** ${stats.running}\n`;
        content += `**Succeeded:** ${stats.succeeded}\n`;
        content += `**Failed:** ${stats.failed}\n`;
        content += `**Discarded:** ${stats.discarded}\n`;

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching job statistics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
