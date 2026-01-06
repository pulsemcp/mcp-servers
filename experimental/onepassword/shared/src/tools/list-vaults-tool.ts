import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IOnePasswordClient } from '../types.js';

const TOOL_DESCRIPTION = `List all 1Password vaults accessible by the service account.

Returns a list of vaults with their IDs and names. Use vault IDs when calling other tools that require a vault parameter.

**Returns:**
- Array of vaults, each with:
  - id: Unique vault identifier
  - name: Human-readable vault name

**Use cases:**
- Discover available vaults before listing or retrieving items
- Get vault IDs needed for other operations
- Verify service account has access to expected vaults`;

/**
 * Tool for listing all accessible vaults
 */
export function listVaultsTool(_server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_list_vaults',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      try {
        const client = clientFactory();
        const vaults = await client.getVaults();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(vaults, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing vaults: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
