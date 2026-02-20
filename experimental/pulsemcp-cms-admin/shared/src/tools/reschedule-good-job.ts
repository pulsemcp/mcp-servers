import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the good job to reschedule',
  scheduled_at:
    'The new scheduled time as an ISO 8601 datetime string (e.g., "2024-01-16T10:00:00Z")',
} as const;

const RescheduleGoodJobSchema = z.object({
  id: z.string().describe(PARAM_DESCRIPTIONS.id),
  scheduled_at: z.string().describe(PARAM_DESCRIPTIONS.scheduled_at),
});

export function rescheduleGoodJob(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'reschedule_good_job',
    description: `Reschedule a GoodJob background job to run at a different time.

Use cases:
- Delay a job to run at a later time
- Reschedule a job that should run during off-peak hours
- Adjust timing for jobs that depend on external conditions`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: PARAM_DESCRIPTIONS.id },
        scheduled_at: { type: 'string', description: PARAM_DESCRIPTIONS.scheduled_at },
      },
      required: ['id', 'scheduled_at'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = RescheduleGoodJobSchema.parse(args);
      const client = clientFactory();

      try {
        const job = await client.rescheduleGoodJob(validatedArgs.id, validatedArgs.scheduled_at);

        let content = `Successfully rescheduled job!\n\n`;
        content += `**ID:** ${job.id}\n`;
        content += `**Job Class:** ${job.job_class}\n`;
        content += `**Queue:** ${job.queue_name}\n`;
        content += `**Status:** ${job.status}\n`;
        if (job.scheduled_at) {
          content += `**Scheduled At:** ${job.scheduled_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error rescheduling good job: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
