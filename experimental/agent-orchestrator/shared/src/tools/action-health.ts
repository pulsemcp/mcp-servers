import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const ACTION_ENUM = [
  'cleanup_processes',
  'retry_sessions',
  'archive_old',
  'cli_refresh',
  'cli_clear_cache',
] as const;

export const ActionHealthSchema = z.object({
  action: z.enum(ACTION_ENUM),
  session_ids: z.array(z.number()).optional(),
  days: z.number().min(1).max(365).optional(),
});

const TOOL_DESCRIPTION = `Perform system health and maintenance actions.

**Actions:**
- **cleanup_processes**: Terminate orphaned agent processes
- **retry_sessions**: Retry failed sessions (optionally specify session_ids)
- **archive_old**: Archive sessions older than N days (requires "days", default 7)
- **cli_refresh**: Trigger a background refresh of CLI tool installations
- **cli_clear_cache**: Clear npm/pip caches and reinstall MCP packages

Note: Health actions are rate-limited (30s cooldown between calls).`;

export function actionHealthTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'action_health',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ACTION_ENUM, description: 'Health action to perform.' },
        session_ids: {
          type: 'array',
          items: { type: 'number' },
          description: 'Session IDs to retry. For retry_sessions action.',
        },
        days: {
          type: 'number',
          minimum: 1,
          maximum: 365,
          description:
            'Archive sessions older than this many days. For archive_old action. Default: 7',
        },
      },
      required: ['action'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = ActionHealthSchema.parse(args);
        const client = clientFactory();
        const { action } = validated;

        let result: string;

        switch (action) {
          case 'cleanup_processes': {
            const response = await client.cleanupProcesses();
            result = `## Processes Cleaned Up\n\n\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;
            break;
          }

          case 'retry_sessions': {
            const response = await client.retrySessions(validated.session_ids);
            result = `## Sessions Retried\n\n\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;
            break;
          }

          case 'archive_old': {
            const response = await client.archiveOldSessions(validated.days);
            result = `## Old Sessions Archived\n\n\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;
            break;
          }

          case 'cli_refresh': {
            const response = await client.refreshCli();
            result = `## CLI Refresh Queued\n\n- **Message:** ${response.message}`;
            break;
          }

          case 'cli_clear_cache': {
            const response = await client.clearCliCache();
            result = `## CLI Cache Clear Queued\n\n- **Message:** ${response.message}`;
            break;
          }

          default: {
            const _exhaustiveCheck: never = action;
            return {
              content: [{ type: 'text', text: `Error: Unknown action "${_exhaustiveCheck}"` }],
              isError: true,
            };
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error performing health action: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
