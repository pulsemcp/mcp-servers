import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  slug: 'Unique slug identifier for the secret (lowercase, hyphenated, e.g. "linear-api-key"). Used to look up an existing secret or to create a new one.',
  onepassword_item_id:
    'The 1Password item reference the secret value lives in (e.g. "op://Vault/Item/credential"). The raw secret value is NEVER passed through this tool — only this reference. If a secret with this slug already exists, this must match its stored reference.',
  mcp_server_slug:
    'Slug of the MCP server to grant the secret to (e.g. "linear"). The link is what Proctor reads to inject the secret value when running that server.',
  title: 'Optional human-readable title for the secret (only used when creating a new secret).',
  description:
    'Optional description of what the secret is for (only used when creating a new secret).',
  onepassword_tag:
    'Optional tag scoping which field of the 1Password item to inject for this server (e.g. "production"). Stored on the server↔secret link, so the same secret can inject different fields per server.',
} as const;

const LinkSecretToMcpServerSchema = z.object({
  slug: z.string().describe(PARAM_DESCRIPTIONS.slug),
  onepassword_item_id: z.string().describe(PARAM_DESCRIPTIONS.onepassword_item_id),
  mcp_server_slug: z.string().describe(PARAM_DESCRIPTIONS.mcp_server_slug),
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  description: z.string().optional().describe(PARAM_DESCRIPTIONS.description),
  onepassword_tag: z.string().optional().describe(PARAM_DESCRIPTIONS.onepassword_tag),
});

export function linkSecretToMcpServer(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'link_secret_to_mcp_server',
    description: `Make an auth secret available to an MCP server. This upserts a Secret (by slug) that references a 1Password item, then writes the server↔secret link that Proctor reads to inject the secret value at runtime.

The raw secret value stays in 1Password — this tool only deals in the 1Password item reference ("onepassword_item_id") and slug, never a credential value.

Behavior:
- If no secret with "slug" exists, it is created from "onepassword_item_id" (plus optional title/description).
- If a secret with "slug" already exists, it is reused. Its stored "onepassword_item_id" must match the one you pass, otherwise the tool errors instead of silently rebinding a shared secret.
- The link is idempotent: re-running for an already-linked server updates the "onepassword_tag" (when provided) without creating a duplicate.

Example request:
{
  "slug": "linear-api-key",
  "onepassword_item_id": "op://Shared/Linear API Key/credential",
  "mcp_server_slug": "linear",
  "onepassword_tag": "production"
}

Use cases:
- Onboarding an auth-gated MCP server: register its credential reference and scope it to the server so Proctor can run it.
- Granting an already-registered secret to an additional server.`,
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: PARAM_DESCRIPTIONS.slug },
        onepassword_item_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.onepassword_item_id,
        },
        mcp_server_slug: { type: 'string', description: PARAM_DESCRIPTIONS.mcp_server_slug },
        title: { type: 'string', description: PARAM_DESCRIPTIONS.title },
        description: { type: 'string', description: PARAM_DESCRIPTIONS.description },
        onepassword_tag: { type: 'string', description: PARAM_DESCRIPTIONS.onepassword_tag },
      },
      required: ['slug', 'onepassword_item_id', 'mcp_server_slug'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = LinkSecretToMcpServerSchema.parse(args);
      const client = clientFactory();

      try {
        const existing = await client.getSecret(validatedArgs.slug);

        if (existing && existing.onepassword_item_id !== validatedArgs.onepassword_item_id) {
          return {
            content: [
              {
                type: 'text',
                text:
                  `Error: a secret with slug "${validatedArgs.slug}" already exists but references a different 1Password item ` +
                  `("${existing.onepassword_item_id}", not "${validatedArgs.onepassword_item_id}"). ` +
                  `Refusing to rebind it, since other servers may depend on it. ` +
                  `Use a different slug, or update the existing secret explicitly if the reference really changed.`,
              },
            ],
            isError: true,
          };
        }

        let created = false;
        if (!existing) {
          try {
            await client.createSecret({
              slug: validatedArgs.slug,
              onepassword_item_id: validatedArgs.onepassword_item_id,
              title: validatedArgs.title,
              description: validatedArgs.description,
            });
          } catch (createError) {
            // The backend also enforces uniqueness on onepassword_item_id, so the
            // item may already be registered under a *different* slug than the one
            // requested. getSecret(slug) can't surface that (it looks up by slug),
            // so translate the opaque uniqueness 422 into actionable guidance
            // instead of letting the raw validation message reach the agent.
            const message =
              createError instanceof Error ? createError.message : String(createError);
            if (/onepassword item/i.test(message) && /taken/i.test(message)) {
              return {
                content: [
                  {
                    type: 'text',
                    text:
                      `Error: the 1Password item "${validatedArgs.onepassword_item_id}" is already registered under a different secret slug, ` +
                      `so it cannot be created again as "${validatedArgs.slug}". ` +
                      `To link it to "${validatedArgs.mcp_server_slug}", re-run this tool with the existing secret's slug ` +
                      `(find it via the secrets list), or register a different 1Password item under "${validatedArgs.slug}".`,
                  },
                ],
                isError: true,
              };
            }
            throw createError;
          }
          created = true;
        }

        const result = await client.linkSecretToServer({
          secret: validatedArgs.slug,
          mcp_server_slug: validatedArgs.mcp_server_slug,
          onepassword_tag: validatedArgs.onepassword_tag,
        });

        let content = `Successfully linked secret "${result.slug}" to MCP server "${result.link.mcp_server_slug}".\n\n`;
        content += `**Secret:** ${result.slug} (id ${result.id}) — ${created ? 'created' : 'reused existing'}\n`;
        content += `**1Password item:** ${result.onepassword_item_id}\n`;
        content += `**Linked server:** ${result.link.mcp_server_slug} (id ${result.link.mcp_server_id})\n`;
        if (result.link.onepassword_tag) {
          content += `**1Password tag:** ${result.link.onepassword_tag}\n`;
        }
        if (result.mcp_server_slugs && result.mcp_server_slugs.length > 0) {
          content += `**All servers using this secret:** ${result.mcp_server_slugs.join(', ')}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error linking secret to MCP server: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
