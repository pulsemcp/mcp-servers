import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { GoodJobStatus } from '../types.js';

const PARAM_DESCRIPTIONS = {
  older_than_days: 'Delete jobs older than this many days',
  status:
    'Only delete jobs with this status (scheduled, retried, queued, running, finished, discarded, error)',
} as const;

const CleanupGoodJobsSchema = z.object({
  older_than_days: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.older_than_days),
  status: z
    .enum(['scheduled', 'retried', 'queued', 'running', 'finished', 'discarded', 'error'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
});

export function cleanupGoodJobs(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'cleanup_good_jobs',
    description: `Clean up old GoodJob background jobs. Deletes jobs matching the specified criteria. This action is irreversible.

Use cases:
- Remove old finished jobs to free up database space
- Clean up discarded or errored jobs after investigation
- Perform routine maintenance on the job queue`,
    inputSchema: {
      type: 'object',
      properties: {
        older_than_days: {
          type: 'number',
          minimum: 1,
          description: PARAM_DESCRIPTIONS.older_than_days,
        },
        status: {
          type: 'string',
          enum: ['scheduled', 'retried', 'queued', 'running', 'finished', 'discarded', 'error'],
          description: PARAM_DESCRIPTIONS.status,
        },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = CleanupGoodJobsSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.cleanupGoodJobs({
          older_than_days: validatedArgs.older_than_days,
          status: validatedArgs.status as GoodJobStatus | undefined,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully cleaned up good jobs.\n\n${result.message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error cleaning up good jobs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
