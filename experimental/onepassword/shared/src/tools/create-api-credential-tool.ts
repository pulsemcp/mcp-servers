import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import { IOnePasswordClient } from '../types.js';
import { sanitizeItemDetails } from './sanitize.js';
import { readOnePasswordElicitationConfig } from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  vaultId: 'The ID of the vault to create the API Credential item in.',
  title: 'The title/name for the API credential item.',
  credential: 'The raw API key / token / secret value to store in the credential field.',
  username: 'Optional username associated with the credential (e.g. a tenant slug).',
  hostname: 'Optional hostname associated with the credential (e.g. "api.pulsemcp.com").',
  expires: 'Optional expiration date in YYYY-MM-DD format.',
  valid_from: 'Optional start date in YYYY-MM-DD format (when the credential becomes valid).',
  tags: 'Optional array of tags to organize the item.',
  notes: 'Optional free-form notes to attach to the item.',
} as const;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const ApiCredentialItemSchema = z.object({
  vaultId: z.string().min(1).describe(PARAM_DESCRIPTIONS.vaultId),
  title: z.string().min(1).describe(PARAM_DESCRIPTIONS.title),
  credential: z.string().min(1).describe(PARAM_DESCRIPTIONS.credential),
  username: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.username),
  hostname: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.hostname),
  expires: z
    .string()
    .regex(DATE_REGEX, { message: 'expires must be in YYYY-MM-DD format' })
    .optional()
    .describe(PARAM_DESCRIPTIONS.expires),
  valid_from: z
    .string()
    .regex(DATE_REGEX, { message: 'valid_from must be in YYYY-MM-DD format' })
    .optional()
    .describe(PARAM_DESCRIPTIONS.valid_from),
  tags: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.tags),
  notes: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.notes),
});

export const CreateApiCredentialSchema = z.object({
  items: z
    .array(ApiCredentialItemSchema)
    .min(1, { message: 'items must contain at least one credential to create' })
    .describe(
      'Array of API credentials to create. Always pass every credential you plan to write in a single call — the user is prompted once for the whole batch. Calling this tool repeatedly with one credential per call subjects the user to a stream of approval prompts and should be avoided.'
    ),
});

const TOOL_DESCRIPTION = `Create one or more API Credential items in 1Password in a single call.

**BATCH ALL CREDENTIALS INTO ONE CALL.** When write elicitation is enabled, this tool prompts the user once for the entire \`items\` array. Calling it once with N credentials shows the user one prompt listing all N credentials; calling it N times forces N separate approval prompts seconds apart — exactly the kind of repeated interruption that frustrates users.

**Plan up front, then call once.** Before invoking this tool, decide every API credential you intend to create for the current workflow (e.g., across all environments, services, or tenants) and pass them all in one \`items\` array. A single call can create credentials across multiple vaults and is still one approval — different vaults are not a reason to split into multiple calls.

**Anti-patterns (do NOT do this):**
- Looping over a list of services or environments and calling \`onepassword_create_api_credential\` once per iteration.
- Creating credentials "as you go" during a multi-step provisioning task instead of accumulating them and writing once.
- Splitting a known-up-front batch into multiple calls because the credentials differ in metadata (\`hostname\`, \`expires\`, etc.) — per-item metadata is fine inside a single batch.

Stores API keys, tokens, or other machine credentials in 1Password's built-in
"API Credential" category — which is preferable to a Secure Note because
consumers (humans and tooling) can recognize it as a credential and surface
fields like \`username\`, \`hostname\`, \`expires\`, and \`valid from\` correctly.

**Returns:**
- A \`results\` array (one entry per input item, in input order) reporting per-item \`status\`
  (\`success\`, \`error\`, \`declined\`, or \`expired\`) and either the created item or an error message.
- Partial failures are surfaced per item — a single bad item does not abort the batch.

**Security Note:** Item IDs are intentionally omitted from the response.

**Note:** Credential values are passed as CLI arguments which may briefly appear in process lists.`;

interface ApiCredentialResult {
  index: number;
  status: 'success' | 'error' | 'declined' | 'expired';
  item?: ReturnType<typeof sanitizeItemDetails>;
  error?: string;
}

function summarizeApiCredentialItem(
  item: z.infer<typeof ApiCredentialItemSchema>,
  index: number
): string {
  const lines: string[] = [`  ${index + 1}. ${item.title} (vault: ${item.vaultId})`];
  if (item.username) lines.push(`     Username: ${item.username}`);
  if (item.hostname) lines.push(`     Hostname: ${item.hostname}`);
  if (item.valid_from) lines.push(`     Valid from: ${item.valid_from}`);
  if (item.expires) lines.push(`     Expires: ${item.expires}`);
  if (item.tags?.length) lines.push(`     Tags: ${item.tags.join(', ')}`);
  return lines.join('\n');
}

/**
 * Tool for creating API Credential items in bulk.
 */
export function createApiCredentialTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_create_api_credential',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          description:
            'Array of API credentials to create. Always pass every credential you plan to write in a single call — the user is prompted once for the whole batch. Calling this tool repeatedly with one credential per call subjects the user to a stream of approval prompts and should be avoided.',
          items: {
            type: 'object',
            properties: {
              vaultId: { type: 'string', description: PARAM_DESCRIPTIONS.vaultId },
              title: { type: 'string', description: PARAM_DESCRIPTIONS.title },
              credential: { type: 'string', description: PARAM_DESCRIPTIONS.credential },
              username: { type: 'string', description: PARAM_DESCRIPTIONS.username },
              hostname: { type: 'string', description: PARAM_DESCRIPTIONS.hostname },
              expires: { type: 'string', description: PARAM_DESCRIPTIONS.expires },
              valid_from: { type: 'string', description: PARAM_DESCRIPTIONS.valid_from },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: PARAM_DESCRIPTIONS.tags,
              },
              notes: { type: 'string', description: PARAM_DESCRIPTIONS.notes },
            },
            required: ['vaultId', 'title', 'credential'],
          },
        },
      },
      required: ['items'],
    },
    handler: async (args: unknown) => {
      try {
        const { items } = CreateApiCredentialSchema.parse(args);

        const elicitConfig = readOnePasswordElicitationConfig();
        if (elicitConfig.writeElicitationEnabled) {
          const summary = items.map((it, i) => summarizeApiCredentialItem(it, i)).join('\n');
          const noun =
            items.length === 1 ? 'API Credential item' : `${items.length} API Credential items`;
          const confirmation = await requestConfirmation(
            {
              server,
              message: `About to create ${noun} in 1Password:\n${summary}\n`,
              requestedSchema: createConfirmationSchema(
                items.length === 1
                  ? 'Create this API credential?'
                  : `Create all ${items.length} API credentials?`,
                'Confirm that you want to create these API Credential items in 1Password. Approving covers the entire batch.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'onepassword_create_api_credential',
              },
            },
            elicitConfig.base
          );

          if (confirmation.action !== 'accept') {
            const status: 'declined' | 'expired' =
              confirmation.action === 'expired' ? 'expired' : 'declined';
            const results: ApiCredentialResult[] = items.map((_, index) => ({ index, status }));
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ results }, null, 2),
                },
              ],
              isError: status === 'expired',
            };
          }

          // Defense-in-depth: some MCP clients may return action='accept' without the
          // user explicitly checking the confirmation checkbox.
          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            const results: ApiCredentialResult[] = items.map((_, index) => ({
              index,
              status: 'declined',
            }));
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ results }, null, 2),
                },
              ],
            };
          }
        }

        const client = clientFactory();
        const results: ApiCredentialResult[] = [];
        for (let index = 0; index < items.length; index++) {
          const it = items[index];
          try {
            const created = await client.createApiCredential(it.vaultId, it.title, it.credential, {
              username: it.username,
              hostname: it.hostname,
              expires: it.expires,
              validFrom: it.valid_from,
              notes: it.notes,
              tags: it.tags,
            });
            results.push({ index, status: 'success', item: sanitizeItemDetails(created) });
          } catch (error) {
            results.push({
              index,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ results }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating API credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
