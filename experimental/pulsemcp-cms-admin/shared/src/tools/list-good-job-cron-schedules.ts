import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function listGoodJobCronSchedules(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_good_job_cron_schedules',
    description: `Retrieve all GoodJob cron schedules. Returns configured recurring job schedules with their cron expressions and next run times.

Example response:
{
  "cron_schedules": [
    {
      "cron_key": "daily_cleanup",
      "job_class": "CleanupJob",
      "cron_schedule": "0 0 * * *",
      "next_scheduled_at": "2024-01-16T00:00:00Z"
    }
  ]
}

Use cases:
- View all configured cron schedules
- Check when the next scheduled run will occur
- Review cron expressions for recurring jobs`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const response = await client.getGoodJobCronSchedules();

        let content = `Found ${response.cron_schedules.length} cron schedules:\n\n`;

        for (const [index, schedule] of response.cron_schedules.entries()) {
          content += `${index + 1}. **${schedule.cron_key}**\n`;
          content += `   Job Class: ${schedule.job_class}\n`;
          content += `   Schedule: \`${schedule.cron_schedule}\`\n`;
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
