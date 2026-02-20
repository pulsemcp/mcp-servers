import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { GoodJobStatus } from '../types.js';

const PARAM_DESCRIPTIONS = {
  older_than_days: 'Delete jobs older than this many days. Minimum: 1, Default: 30',
  status: 'Only delete jobs with this status (succeeded, failed, discarded). Default: succeeded',
} as const;

const CleanupGoodJobsSchema = z.object({
  older_than_days: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.older_than_days),
  status: z
    .enum(['succeeded', 'failed', 'discarded'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
});

export function cleanupGoodJobs(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'cleanup_good_jobs',
    description: `Clean up old GoodJob background jobs by deleting them. Removes jobs matching the specified criteria to free up database space.

Example request:
{
  "older_than_days": 30,
  "status": "succeeded"
}

Use cases:
- Clean up old succeeded jobs to reduce database size
- Remove failed jobs that have been reviewed and resolved
- Periodic maintenance of the job queue`,
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
          enum: ['succeeded', 'failed', 'discarded'],
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

        let content = `Successfully cleaned up jobs.\n\n${result.message}`;
        if (result.deleted_count !== undefined) {
          content += `\n\n**Deleted:** ${result.deleted_count} jobs`;
        }

        return { content: [{ type: 'text', text: content }] };
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
