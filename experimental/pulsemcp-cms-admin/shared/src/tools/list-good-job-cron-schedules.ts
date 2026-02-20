import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function listGoodJobCronSchedules(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_good_job_cron_schedules',
    description: `Retrieve a list of all GoodJob cron schedules. Returns configured recurring job schedules with their cron expressions and next run times.

Example response:
[
  {
    "cron_key": "sync_servers",
    "job_class": "SyncMCPServersJob",
    "cron_expression": "0 */6 * * *",
    "description": "Sync MCP servers every 6 hours",
    "next_scheduled_at": "2024-01-15T18:00:00Z"
  }
]

Use cases:
- Review all configured cron schedules
- Check when the next run of a recurring job is scheduled
- Audit cron job configuration`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const schedules = await client.getGoodJobCronSchedules();

        let content = `Found ${schedules.length} cron schedules:\n\n`;

        for (const [index, schedule] of schedules.entries()) {
          content += `${index + 1}. **${schedule.cron_key}** - ${schedule.job_class}\n`;
          content += `   Cron: ${schedule.cron_expression}\n`;
          if (schedule.description) {
            content += `   Description: ${schedule.description}\n`;
          }
          if (schedule.next_scheduled_at) {
            content += `   Next Run: ${schedule.next_scheduled_at}\n`;
          }
          if (schedule.last_run_at) {
            content += `   Last Run: ${schedule.last_run_at}\n`;
          }
          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching cron schedules: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
