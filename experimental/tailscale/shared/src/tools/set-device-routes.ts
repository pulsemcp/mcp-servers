import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  device_id: 'The ID of the device whose enabled routes to set. Get this from list_devices.',
  routes:
    'The complete set of subnet routes to enable for the device (e.g. ["10.0.0.0/24", "192.168.1.0/24"]). This REPLACES the currently enabled routes. Only routes the device advertises can be enabled.',
} as const;

const SetDeviceRoutesSchema = z.object({
  device_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.device_id),
  routes: z.array(z.string().min(1)).describe(PARAM_DESCRIPTIONS.routes),
});

export function setDeviceRoutes(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'set_device_routes',
    description: `Set the enabled subnet routes for a device.

Replaces the set of enabled (approved) subnet routes for a device. Use
get_device_routes to see which routes the device advertises — only advertised
routes can be enabled.

**This REPLACES the enabled routes** — pass the full desired set, not just
additions. Pass [] to disable all routes.

**Returns:**
- The device's advertised and (updated) enabled routes

**Use cases:**
- Approve a subnet router's advertised routes
- Enable an exit node (0.0.0.0/0 and ::/0)
- Revoke previously-approved routes`,
    inputSchema: {
      type: 'object',
      properties: {
        device_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.device_id,
        },
        routes: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.routes,
        },
      },
      required: ['device_id', 'routes'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SetDeviceRoutesSchema.parse(args);
      const client = clientFactory();

      try {
        const routes = await client.setDeviceRoutes(validatedArgs.device_id, validatedArgs.routes);

        let content = `## Device Routes Updated\n\nDevice \`${validatedArgs.device_id}\`\n\n`;
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
              text: `Error setting device routes: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
