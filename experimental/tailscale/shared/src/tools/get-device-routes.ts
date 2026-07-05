import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  device_id: 'The ID of the device whose routes to retrieve. Get this from list_devices.',
} as const;

const GetDeviceRoutesSchema = z.object({
  device_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.device_id),
});

export function getDeviceRoutes(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_device_routes',
    description: `Get the subnet routes for a device.

Returns the routes a device advertises and the subset that are currently enabled
(approved) for the tailnet.

**Returns:**
- advertisedRoutes: Routes the device offers to route
- enabledRoutes: Routes that are approved/active

**Use cases:**
- Check which subnet routes a relay/exit node advertises
- Verify whether advertised routes have been approved
- Inspect before calling set_device_routes to change the enabled set`,
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
      const validatedArgs = GetDeviceRoutesSchema.parse(args);
      const client = clientFactory();

      try {
        const routes = await client.getDeviceRoutes(validatedArgs.device_id);

        let content = `## Routes for Device ${validatedArgs.device_id}\n\n`;
        content += `**Advertised routes:** ${
          routes.advertisedRoutes?.length ? routes.advertisedRoutes.join(', ') : '(none)'
        }\n`;
        content += `**Enabled routes:** ${
          routes.enabledRoutes?.length ? routes.enabledRoutes.join(', ') : '(none)'
        }`;

        return {
          content: [{ type: 'text', text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting device routes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
