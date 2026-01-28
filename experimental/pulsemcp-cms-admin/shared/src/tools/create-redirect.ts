import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { RedirectStatus } from '../types.js';

const PARAM_DESCRIPTIONS = {
  from: 'The source path to redirect from (e.g., "/old-page")',
  to: 'The destination path or URL to redirect to (e.g., "/new-page" or "https://example.com")',
  status: 'The status of the redirect (draft, active, paused, archived). Defaults to draft.',
} as const;

const CreateRedirectSchema = z.object({
  from: z.string().describe(PARAM_DESCRIPTIONS.from),
  to: z.string().describe(PARAM_DESCRIPTIONS.to),
  status: z
    .enum(['draft', 'active', 'paused', 'archived'])
    .optional()
    .describe(PARAM_DESCRIPTIONS.status),
});

export function createRedirect(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_redirect',
    description: `Create a new URL redirect entry. Redirects manage URL routing on the PulseMCP website.

Example request:
{
  "from": "/old-page",
  "to": "/new-page",
  "status": "draft"
}

Use cases:
- Create a new redirect when moving content to a new URL
- Set up redirects for deprecated pages
- Create draft redirects for review before activation`,
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: PARAM_DESCRIPTIONS.from },
        to: { type: 'string', description: PARAM_DESCRIPTIONS.to },
        status: {
          type: 'string',
          enum: ['draft', 'active', 'paused', 'archived'],
          description: PARAM_DESCRIPTIONS.status,
        },
      },
      required: ['from', 'to'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = CreateRedirectSchema.parse(args);
      const client = clientFactory();

      try {
        const redirect = await client.createRedirect({
          from: validatedArgs.from,
          to: validatedArgs.to,
          status: validatedArgs.status as RedirectStatus | undefined,
        });

        let content = `Successfully created redirect!\n\n`;
        content += `**ID:** ${redirect.id}\n`;
        content += `**From:** ${redirect.from}\n`;
        content += `**To:** ${redirect.to}\n`;
        content += `**Status:** ${redirect.status}\n`;
        if (redirect.created_at) {
          content += `**Created:** ${redirect.created_at}\n`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating redirect: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
