import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  device_id: 'The ID of the device to retrieve. Get this from list_devices.',
  all_fields:
    'When true, request the full set of device fields (equivalent to `fields=all`). Defaults to false.',
} as const;

const GetDeviceSchema = z.object({
  device_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.device_id),
  all_fields: z.boolean().optional().describe(PARAM_DESCRIPTIONS.all_fields),
});

export function getDevice(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_device',
    description: `Get detailed information about a single device.

Returns the full metadata for one device (node) in the tailnet.

**Returns:**
- The device object, including addresses, OS, client version, tags, key expiry,
  authorization status, and (with all_fields) advanced fields

**Use cases:**
- Inspect a specific device's configuration
- Check a device's authorization status or tags before modifying them
- Debug connectivity or key-expiry issues`,
    inputSchema: {
      type: 'object',
      properties: {
        device_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.device_id,
        },
        all_fields: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.all_fields,
        },
      },
      required: ['device_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetDeviceSchema.parse(args);
      const client = clientFactory();

      try {
        const device = await client.getDevice(validatedArgs.device_id, validatedArgs.all_fields);

        const content =
          `## Device: ${device.name || device.hostname || device.id}\n\n` +
          '```json\n' +
          JSON.stringify(device, null, 2) +
          '\n```';

        return {
          content: [{ type: 'text', text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting device: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
