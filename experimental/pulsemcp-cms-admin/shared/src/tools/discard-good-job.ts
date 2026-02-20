import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the good job to discard',
} as const;

const DiscardGoodJobSchema = z.object({
  id: z.string().describe(PARAM_DESCRIPTIONS.id),
});

export function discardGoodJob(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'discard_good_job',
    description: `Discard a GoodJob background job. Marks the job as discarded so it will not be retried.

Use cases:
- Permanently skip a job that cannot succeed
- Remove jobs that are no longer needed
- Clean up stuck or problematic jobs`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: PARAM_DESCRIPTIONS.id },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DiscardGoodJobSchema.parse(args);
      const client = clientFactory();

      try {
        const job = await client.discardGoodJob(validatedArgs.id);

        let content = `Successfully discarded job!\n\n`;
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
              text: `Error discarding good job: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
