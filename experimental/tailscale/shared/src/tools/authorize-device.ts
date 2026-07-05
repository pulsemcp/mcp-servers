import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  device_id: 'The ID of the device to authorize or deauthorize. Get this from list_devices.',
  authorized:
    'Set to true to authorize the device (allow it onto the tailnet), or false to deauthorize it. Defaults to true.',
} as const;

const AuthorizeDeviceSchema = z.object({
  device_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.device_id),
  authorized: z.boolean().optional().default(true).describe(PARAM_DESCRIPTIONS.authorized),
});

export function authorizeDevice(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'authorize_device',
    description: `Authorize or deauthorize a device.

Sets the authorization state of a device. Relevant for tailnets that require
device authorization — an unauthorized device cannot connect.

**Returns:**
- Confirmation of the new authorization state

**Use cases:**
- Approve a newly-joined device
- Revoke a device's access by deauthorizing it`,
    inputSchema: {
      type: 'object',
      properties: {
        device_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.device_id,
        },
        authorized: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.authorized,
        },
      },
      required: ['device_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = AuthorizeDeviceSchema.parse(args);
      const client = clientFactory();

      try {
        await client.authorizeDevice(validatedArgs.device_id, validatedArgs.authorized);

        const state = validatedArgs.authorized ? 'authorized' : 'deauthorized';
        return {
          content: [
            {
              type: 'text',
              text: `## Device ${state}\n\nDevice \`${validatedArgs.device_id}\` has been ${state}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error authorizing device: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
