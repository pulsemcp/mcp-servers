import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  device_id: 'The ID of the device to remove from the tailnet. Get this from list_devices.',
} as const;

const DeleteDeviceSchema = z.object({
  device_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.device_id),
});

export function deleteDevice(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_device',
    description: `Remove a device from the tailnet.

Permanently deletes a device (node) from the tailnet. The device will need to
re-authenticate to rejoin.

**Warning:**
- This action is irreversible
- The device loses tailnet access immediately

**Returns:**
- Confirmation of removal

**Use cases:**
- Decommission a retired machine
- Remove a stale or compromised device`,
    inputSchema: {
      type: 'object',
      properties: {
        device_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.device_id,
        },
      },
      required: ['device_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteDeviceSchema.parse(args);
      const client = clientFactory();

      try {
        await client.deleteDevice(validatedArgs.device_id);

        return {
          content: [
            {
              type: 'text',
              text: `## Device Removed\n\nDevice \`${validatedArgs.device_id}\` has been permanently removed from the tailnet.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting device: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
