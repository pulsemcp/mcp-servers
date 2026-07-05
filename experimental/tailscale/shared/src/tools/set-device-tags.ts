import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  device_id: 'The ID of the device to tag. Get this from list_devices.',
  tags: 'The complete set of tags to assign to the device (e.g. ["tag:server", "tag:prod"]). This REPLACES the device\'s existing tags. Each tag must start with "tag:" and be defined in the tailnet policy file.',
} as const;

const SetDeviceTagsSchema = z.object({
  device_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.device_id),
  tags: z
    .array(z.string().regex(/^tag:/, 'Each tag must start with "tag:"'))
    .describe(PARAM_DESCRIPTIONS.tags),
});

export function setDeviceTags(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'set_device_tags',
    description: `Set the tags on a device.

Replaces the device's ACL tags with the provided set. Tags must be defined in
the tailnet policy file (under \`tagOwners\`) before they can be applied.

**This REPLACES all tags on the device** — pass the full desired set, not just
additions.

**Returns:**
- Confirmation of the applied tags

**Use cases:**
- Classify a device (e.g. tag:prod, tag:server) so ACL rules apply
- Remove tags by passing a smaller set (or [] to clear)`,
    inputSchema: {
      type: 'object',
      properties: {
        device_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.device_id,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
      },
      required: ['device_id', 'tags'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SetDeviceTagsSchema.parse(args);
      const client = clientFactory();

      try {
        await client.setDeviceTags(validatedArgs.device_id, validatedArgs.tags);

        const tagList = validatedArgs.tags.length ? validatedArgs.tags.join(', ') : '(none)';
        return {
          content: [
            {
              type: 'text',
              text: `## Device Tags Updated\n\nDevice \`${validatedArgs.device_id}\` tags set to: ${tagList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting device tags: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
