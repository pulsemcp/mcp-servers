import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the GoodJob to reschedule',
  scheduled_at: 'The new scheduled time for the job (ISO 8601 format)',
} as const;

const RescheduleGoodJobSchema = z.object({
  id: z.string().describe(PARAM_DESCRIPTIONS.id),
  scheduled_at: z.string().describe(PARAM_DESCRIPTIONS.scheduled_at),
});

export function rescheduleGoodJob(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'reschedule_good_job',
    description: `Reschedule a GoodJob background job to a new time. Changes the scheduled_at time for the job.

Example request:
{
  "id": "abc-123",
  "scheduled_at": "2024-01-16T10:00:00Z"
}

Use cases:
- Delay a scheduled job to a later time
- Reschedule a job to run during off-peak hours
- Adjust timing of a job that was scheduled incorrectly`,
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
        const result = await client.rescheduleGoodJob(validatedArgs.id, validatedArgs.scheduled_at);

        let content = `Successfully rescheduled job (ID: ${validatedArgs.id}).\n\n${result.message}`;
        if (result.job) {
          content += `\n\n**New Scheduled At:** ${result.job.scheduled_at}`;
          content += `\n**Status:** ${result.job.status}`;
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
