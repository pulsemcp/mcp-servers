import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the GoodJob to discard',
} as const;

const DiscardGoodJobSchema = z.object({
  id: z.string().describe(PARAM_DESCRIPTIONS.id),
});

export function discardGoodJob(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'discard_good_job',
    description: `Discard a GoodJob background job. Marks the job as discarded so it will not be retried.

Use cases:
- Discard a job that is no longer needed
- Stop a failing job from being retried
- Clean up jobs that are stuck or obsolete`,
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
        const result = await client.discardGoodJob(validatedArgs.id);

        let content = `Successfully discarded job (ID: ${validatedArgs.id}).\n\n${result.message}`;
        if (result.job) {
          content += `\n\n**New Status:** ${result.job.status}`;
        }

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
