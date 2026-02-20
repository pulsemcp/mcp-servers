import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the good job to retry',
} as const;

const RetryGoodJobSchema = z.object({
  id: z.string().describe(PARAM_DESCRIPTIONS.id),
});

export function retryGoodJob(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'retry_good_job',
    description: `Retry a failed or errored GoodJob background job. Re-enqueues the job for processing.

Use cases:
- Retry a job that failed due to a transient error
- Re-process a job after fixing the underlying issue
- Manually trigger re-execution of a specific job`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = RetryGoodJobSchema.parse(args);
      const client = clientFactory();

      try {
        const job = await client.retryGoodJob(validatedArgs.id);

        let content = `Successfully retried job!\n\n`;
        content += `**ID:** ${job.id}\n`;
        content += `**Job Class:** ${job.job_class}\n`;
        content += `**Queue:** ${job.queue_name}\n`;
        content += `**Status:** ${job.status}\n`;

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrying good job: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
