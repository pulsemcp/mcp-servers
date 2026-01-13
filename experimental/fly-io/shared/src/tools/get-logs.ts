import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app to get logs for.',
  region: 'Optional: Filter logs by region (e.g., "iad", "lax").',
  machine_id: 'Optional: Filter logs by specific machine ID.',
} as const;

export const GetLogsSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  region: z.string().optional().describe(PARAM_DESCRIPTIONS.region),
  machine_id: z.string().optional().describe(PARAM_DESCRIPTIONS.machine_id),
});

const TOOL_DESCRIPTION = `Get logs for an app or specific machine.

Retrieves recent logs from Fly.io machines. Can filter by region or specific machine.

**Returns:**
- Log output from the app's machines

**Use cases:**
- Debug application errors
- Monitor app behavior
- Check deployment status
- Investigate crashes`;

export function getLogsTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'get_logs',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        region: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.region,
        },
        machine_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.machine_id,
        },
      },
      required: ['app_name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetLogsSchema.parse(args);
        const client = clientFactory();

        const logs = await client.getLogs(validatedArgs.app_name, {
          region: validatedArgs.region,
          machineId: validatedArgs.machine_id,
        });

        if (!logs || logs.trim() === '') {
          return {
            content: [
              {
                type: 'text',
                text: `No logs found for app "${validatedArgs.app_name}".`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: logs,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
