import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  id: 'The integer id of the MCP server (the "mirror id" used elsewhere in the proctor flow)',
  known_missing_init_tools_list:
    'Whether the MCP server is known to be missing the init/tools-list capability. true marks the server as known-missing (proctor will skip the init/tools-list exam); false clears the flag.',
  known_missing_init_tools_list_filter_to:
    'Optional. When set, scopes the known-missing flag to a specific entry (e.g., "remotes[0]" or "packages[0]"). Pass an empty string or null to clear the filter. Omit the parameter entirely to leave the existing value untouched.',
} as const;

const SetKnownMissingInitToolsListSchema = z.object({
  id: z.number().int().describe(PARAM_DESCRIPTIONS.id),
  known_missing_init_tools_list: z
    .boolean()
    .describe(PARAM_DESCRIPTIONS.known_missing_init_tools_list),
  known_missing_init_tools_list_filter_to: z
    .string()
    .nullable()
    .optional()
    .describe(PARAM_DESCRIPTIONS.known_missing_init_tools_list_filter_to),
});

export function setKnownMissingInitToolsList(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'set_known_missing_init_tools_list',
    description: `Update the \`known_missing_init_tools_list\` flag on an MCP server. Optionally also updates the \`known_missing_init_tools_list_filter_to\` scoping value. Identifies the server by integer id (the "mirror id" used elsewhere in the proctor flow).

Example request:
{
  "id": 27765,
  "known_missing_init_tools_list": true,
  "known_missing_init_tools_list_filter_to": "remotes[0]"
}

Use cases:
- Mark a server as known-missing the init/tools-list capability so proctor skips that exam
- Clear the known-missing flag once the server starts responding correctly
- Scope the known-missing flag to a specific remote/package entry via the filter_to value`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: PARAM_DESCRIPTIONS.id },
        known_missing_init_tools_list: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.known_missing_init_tools_list,
        },
        known_missing_init_tools_list_filter_to: {
          type: ['string', 'null'],
          description: PARAM_DESCRIPTIONS.known_missing_init_tools_list_filter_to,
        },
      },
      required: ['id', 'known_missing_init_tools_list'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SetKnownMissingInitToolsListSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.setKnownMissingInitToolsList(
          validatedArgs.id,
          validatedArgs.known_missing_init_tools_list,
          validatedArgs.known_missing_init_tools_list_filter_to
        );

        const filterDisplay =
          result.known_missing_init_tools_list_filter_to === null
            ? '(none)'
            : result.known_missing_init_tools_list_filter_to;
        const text = `Updated MCP server ${result.slug} (id: ${result.id}):
- known_missing_init_tools_list: ${result.known_missing_init_tools_list}
- known_missing_init_tools_list_filter_to: ${filterDisplay}`;

        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting known_missing_init_tools_list: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
