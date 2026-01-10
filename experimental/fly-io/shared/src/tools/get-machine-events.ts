import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the app containing the machine.',
  machine_id: 'The ID of the machine to get events for.',
} as const;

export const GetMachineEventsSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  machine_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.machine_id),
});

const TOOL_DESCRIPTION = `Get recent events for a machine.

Retrieves the event log for a machine, showing state transitions, errors, and other lifecycle events. This is useful for debugging and monitoring machine behavior.

**Returns:**
- List of events with type, status, source, and timestamp
- Exit event details when applicable (exit codes, signals, OOM status)

**Use cases:**
- Debug why a machine crashed or stopped
- Monitor machine lifecycle events
- Check for OOM (out of memory) kills
- Verify successful deployments`;

export function getMachineEventsTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'get_machine_events',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        machine_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.machine_id,
        },
      },
      required: ['app_name', 'machine_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetMachineEventsSchema.parse(args);
        const client = clientFactory();

        const machine = await client.getMachine(validatedArgs.app_name, validatedArgs.machine_id);
        const events = machine.events || [];

        if (events.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No events found for machine "${validatedArgs.machine_id}" in app "${validatedArgs.app_name}".`,
              },
            ],
          };
        }

        // Format events for display
        const formattedEvents = events.map((event) => {
          const date = new Date(event.timestamp * 1000).toISOString();
          let eventStr = `[${date}] ${event.type} - ${event.status} (source: ${event.source})`;

          if (event.request?.exit_event) {
            const exit = event.request.exit_event;
            const details: string[] = [];
            if (exit.exit_code !== undefined) details.push(`exit_code=${exit.exit_code}`);
            if (exit.signal !== undefined) details.push(`signal=${exit.signal}`);
            if (exit.oom_killed) details.push('OOM_KILLED');
            if (exit.error) details.push(`error="${exit.error}"`);
            if (details.length > 0) {
              eventStr += `\n    Exit details: ${details.join(', ')}`;
            }
          }

          return eventStr;
        });

        return {
          content: [
            {
              type: 'text',
              text: `Events for machine "${validatedArgs.machine_id}" in app "${validatedArgs.app_name}":\n\n${formattedEvents.join('\n\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting machine events: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
