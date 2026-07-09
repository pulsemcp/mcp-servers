import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  scopes:
    'OAuth scopes to grant the client (at least one required). Use read/write scopes like "devices:core" (device write, e.g. deleting a stale node), "devices:core:read", "all", or "all:read". See https://tailscale.com/kb/1623/ for the full vocabulary.',
  tags: 'ACL tags the client\'s access tokens may assign to devices (e.g. ["tag:ci"]). Tags must be defined in the tailnet policy file. Mandatory when scopes include "devices:core" or "auth_keys".',
  description:
    'A short human-readable description of the client (alphanumeric, spaces, and hyphens; max 50 characters).',
} as const;

const CreateOAuthClientSchema = z.object({
  scopes: z
    .array(z.string().min(1))
    .min(1, 'At least one scope is required')
    .describe(PARAM_DESCRIPTIONS.scopes),
  tags: z
    .array(z.string().regex(/^tag:/, 'Each tag must start with "tag:"'))
    .optional()
    .describe(PARAM_DESCRIPTIONS.tags),
  description: z.string().max(50).optional().describe(PARAM_DESCRIPTIONS.description),
});

export function createOAuthClient(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_oauth_client',
    description: `Create a Tailscale OAuth client (client_id + client_secret).

Mints a non-interactive credential for API automation. Unlike a device auth key
(create_auth_key) — which only enrolls devices — an OAuth client can be exchanged
for short-lived access tokens that call \`devices\`-write API endpoints, such as
deleting a stale tailnet node on redeploy.

**Scopes & tags:** Grant the least-privileged scopes for the job (e.g.
["devices:core"] for device management, or a :read variant for read-only access).
When the scopes include "devices:core" or "auth_keys", you MUST supply \`tags\`.

**Important:** The client_secret is returned ONLY once, in this response.
Store it securely — it cannot be retrieved again. (You can still list and revoke
the client afterward with list_keys / get_key / delete_key, using its client_id.)

**Returns:**
- The client_id and the once-only client_secret, plus the granted scopes and tags

**Use cases:**
- Provision an API credential for a CI/CD workflow (e.g. a deploy that deletes a
  stale node holding a stable MagicDNS name)
- Create a scoped, tagged credential for automated tailnet management`,
    inputSchema: {
      type: 'object',
      properties: {
        scopes: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.scopes,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.tags,
        },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
      },
      required: ['scopes'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateOAuthClientSchema.parse(args);
      const client = clientFactory();

      try {
        const oauthClient = await client.createOAuthClient({
          scopes: validatedArgs.scopes,
          tags: validatedArgs.tags,
          description: validatedArgs.description,
        });

        let content = '## OAuth Client Created\n\n';
        content += `**Client ID:** \`${oauthClient.id}\`\n`;
        if (oauthClient.scopes && oauthClient.scopes.length > 0) {
          content += `**Scopes:** ${oauthClient.scopes.join(', ')}\n`;
        }
        if (oauthClient.tags && oauthClient.tags.length > 0) {
          content += `**Tags:** ${oauthClient.tags.join(', ')}\n`;
        }
        if (oauthClient.description) content += `**Description:** ${oauthClient.description}\n`;
        content += '\n⚠️ **Save the client secret now — it will not be shown again:**\n\n';
        content += '```\n';
        content += oauthClient.key ?? '(no client secret returned)';
        content += '\n```';

        return {
          content: [{ type: 'text', text: content }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating OAuth client: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
