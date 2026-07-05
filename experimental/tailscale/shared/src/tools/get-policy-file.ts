import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function getPolicyFile(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_policy_file',
    description: `Get the tailnet policy file (ACLs).

Returns the current tailnet policy file — the HuJSON document that defines
access-control rules, groups, tag owners, autoApprovers, SSH rules, and tests
for the tailnet.

**Returns:**
- The raw policy file content (HuJSON)
- The current ETag, which should be passed to update_policy_file to safely apply
  a change only if the policy has not been modified in the meantime

**Use cases:**
- Inspect the current access-control configuration
- Fetch the policy (and its ETag) before making an edit
- Audit groups, tag ownership, and ACL rules`,
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const policy = await client.getPolicyFile();

        let content = '## Tailnet Policy File\n\n';
        if (policy.etag) {
          content += `**ETag:** \`${policy.etag}\`\n\n`;
        }
        content += '```hujson\n';
        content += policy.content;
        content += '\n```';

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting policy file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
