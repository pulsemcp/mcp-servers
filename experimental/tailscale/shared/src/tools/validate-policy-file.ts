import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  content:
    'The full policy file content (HuJSON or JSON) to validate. This is validated against the tailnet without being applied.',
} as const;

const ValidatePolicyFileSchema = z.object({
  content: z.string().min(1).describe(PARAM_DESCRIPTIONS.content),
});

export function validatePolicyFile(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'validate_policy_file',
    description: `Validate a tailnet policy file without applying it.

Checks a proposed policy file (HuJSON or JSON) for syntax errors and ACL test
failures. This is a read-only, side-effect-free operation — the policy is NOT
applied to the tailnet.

**Returns:**
- Whether the policy is valid
- On failure: the validation error message and any structured detail

**Use cases:**
- Dry-run a policy edit before calling update_policy_file
- Verify ACL "tests" pass against the proposed rules
- Catch syntax errors early during autonomous policy editing`,
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.content,
        },
      },
      required: ['content'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = ValidatePolicyFileSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.validatePolicyFile(validatedArgs.content);

        if (result.valid) {
          return {
            content: [
              {
                type: 'text',
                text: '## Policy Validation\n\n✅ The policy file is valid.',
              },
            ],
          };
        }

        let content = '## Policy Validation\n\n❌ The policy file is invalid.\n\n';
        if (result.message) {
          content += `**Message:** ${result.message}\n\n`;
        }
        if (result.data !== undefined) {
          content += '**Details:**\n```json\n';
          content += JSON.stringify(result.data, null, 2);
          content += '\n```';
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
              text: `Error validating policy file: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
