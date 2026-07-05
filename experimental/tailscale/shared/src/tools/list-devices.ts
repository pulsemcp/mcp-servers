import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { Device } from '../types.js';

const PARAM_DESCRIPTIONS = {
  all_fields:
    'When true, request the full set of device fields (equivalent to `fields=all`). Defaults to false for a more compact listing.',
} as const;

const ListDevicesSchema = z.object({
  all_fields: z.boolean().optional().describe(PARAM_DESCRIPTIONS.all_fields),
});

function summarizeDevice(device: Device): string {
  let out = `### ${device.name || device.hostname || device.id}\n`;
  out += `- **ID:** ${device.id}\n`;
  if (device.hostname) out += `- **Hostname:** ${device.hostname}\n`;
  if (device.addresses?.length) out += `- **Addresses:** ${device.addresses.join(', ')}\n`;
  if (device.os) out += `- **OS:** ${device.os}\n`;
  if (device.user) out += `- **User:** ${device.user}\n`;
  if (typeof device.authorized === 'boolean') out += `- **Authorized:** ${device.authorized}\n`;
  if (device.tags?.length) out += `- **Tags:** ${device.tags.join(', ')}\n`;
  if (device.lastSeen) out += `- **Last seen:** ${device.lastSeen}\n`;
  if (device.updateAvailable) out += `- **Update available:** yes\n`;
  return out;
}

export function listDevices(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_devices',
    description: `List devices in the tailnet.

Returns all devices (nodes) currently in the tailnet, with basic identifying
information for each.

**Returns:**
- devices: Array of devices with id, hostname, addresses, OS, user, tags,
  authorization status, and last-seen time

**Use cases:**
- Inventory the tailnet
- Find a device ID to pass to other device tools
- Audit which devices are authorized or have updates available`,
    inputSchema: {
      type: 'object',
      properties: {
        all_fields: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.all_fields,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      const validatedArgs = ListDevicesSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.listDevices(validatedArgs.all_fields);

        if (!response.devices || response.devices.length === 0) {
          return {
            content: [{ type: 'text', text: 'No devices found in the tailnet.' }],
          };
        }

        let content = `## Devices (${response.devices.length})\n\n`;
        for (const device of response.devices) {
          content += summarizeDevice(device) + '\n';
        }

        return {
          content: [{ type: 'text', text: content.trim() }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing devices: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
