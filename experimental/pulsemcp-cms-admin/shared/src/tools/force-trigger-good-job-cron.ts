import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  cron_key: 'The cron key of the schedule to trigger',
} as const;

const ForceTriggerGoodJobCronSchema = z.object({
  cron_key: z.string().describe(PARAM_DESCRIPTIONS.cron_key),
});

export function forceTriggerGoodJobCron(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'force_trigger_good_job_cron',
    description: `Force trigger a GoodJob cron schedule immediately. Enqueues a new job for the specified cron schedule regardless of its normal schedule.

Use cases:
- Manually trigger a cron job for testing
- Force an immediate run of a periodic job
- Re-run a cron job that was missed`,
    inputSchema: {
      type: 'object',
      properties: {
        cron_key: { type: 'string', description: PARAM_DESCRIPTIONS.cron_key },
      },
      required: ['cron_key'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = ForceTriggerGoodJobCronSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.forceTriggerGoodJobCron(validatedArgs.cron_key);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully triggered cron schedule "${validatedArgs.cron_key}".\n\n${result.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error triggering cron schedule: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
