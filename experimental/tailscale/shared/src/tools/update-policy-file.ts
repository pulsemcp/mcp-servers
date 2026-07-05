import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  content:
    'The full policy file content (HuJSON or JSON) to set. This REPLACES the entire tailnet policy file — it is not a partial patch.',
  etag: 'Optional ETag from get_policy_file. When provided, the update is applied only if the policy file has not changed since it was fetched (optimistic concurrency via If-Match). Strongly recommended to avoid clobbering concurrent edits.',
} as const;

const UpdatePolicyFileSchema = z.object({
  content: z.string().min(1).describe(PARAM_DESCRIPTIONS.content),
  etag: z.string().optional().describe(PARAM_DESCRIPTIONS.etag),
});

export function updatePolicyFile(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_policy_file',
    description: `Replace the tailnet policy file (ACLs).

Sets the entire tailnet policy file to the provided HuJSON/JSON content. This is
the primary write capability for configuring tailnet access control.

**This REPLACES the whole policy file.** To make a targeted change, first call
get_policy_file, edit the returned content, then pass the full edited document
here along with the returned ETag.

**Concurrency:** Pass the \`etag\` from get_policy_file to apply the change only if
the policy has not been modified in the meantime. If it has, the API returns a
precondition-failed error and no change is made.

**Tip:** Call validate_policy_file first to catch syntax errors and failing ACL
tests before applying.

**Returns:**
- Confirmation and the new ETag of the applied policy

**Use cases:**
- Add or modify ACL rules, groups, or tag owners
- Configure SSH access rules or autoApprovers
- Apply an autonomously-generated policy change`,
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.content,
        },
        etag: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.etag,
        },
      },
      required: ['content'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UpdatePolicyFileSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.updatePolicyFile(validatedArgs.content, validatedArgs.etag);

        let content = '## Policy File Updated\n\n';
        content += '✅ The tailnet policy file has been replaced.\n';
        if (result.etag) {
          content += `\n**New ETag:** \`${result.etag}\``;
        }

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating policy file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
