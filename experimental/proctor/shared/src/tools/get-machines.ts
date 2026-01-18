import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function getMachines(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_machines',
    description: `List active Fly.io machines used for Proctor exams.

Returns information about currently running or recently active Fly machines
that are being used for exam execution.

**Returns:**
- machines: Array of machine objects with id, state, region, and other metadata

**Use cases:**
- Monitor active exam execution infrastructure
- Find machines to clean up or cancel
- Debug issues with running exams
- Check resource utilization

**Note:**
- Machines may be in various states (running, stopped, etc.)
- Use destroy_machine to remove machines that are no longer needed
- Use cancel_exam to stop a running exam on a specific machine`,
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const response = await client.getMachines();

        if (response.machines.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No active Fly.io machines found.',
              },
            ],
          };
        }

        let content = `## Active Machines (${response.machines.length})\n\n`;

        for (const machine of response.machines) {
          content += `### Machine: ${machine.id}\n`;
          if (machine.name) content += `- **Name:** ${machine.name}\n`;
          if (machine.state) content += `- **State:** ${machine.state}\n`;
          if (machine.region) content += `- **Region:** ${machine.region}\n`;
          if (machine.created_at) content += `- **Created:** ${machine.created_at}\n`;

          // Include any other properties
          const otherProps = Object.entries(machine).filter(
            ([key]) => !['id', 'name', 'state', 'region', 'created_at'].includes(key)
          );
          if (otherProps.length > 0) {
            for (const [key, value] of otherProps) {
              content += `- **${key}:** ${JSON.stringify(value)}\n`;
            }
          }
          content += '\n';
        }

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting machines: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
