import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  url: 'The URL to fetch backlinks for. Must be a valid HTTP/HTTPS URL.',
  scope:
    'Scope of the backlinks lookup: "url" (exact URL, default), "domain" (entire root domain), or "subdomain" (specific subdomain)',
  limit: 'Number of backlinks to return, 1-50. Default: 1',
} as const;

const GetMozBacklinksSchema = z.object({
  url: z.string().describe(PARAM_DESCRIPTIONS.url),
  scope: z.enum(['url', 'domain', 'subdomain']).optional().describe(PARAM_DESCRIPTIONS.scope),
  limit: z.number().min(1).max(50).optional().describe(PARAM_DESCRIPTIONS.limit),
});

export function getMozBacklinks(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_moz_backlinks',
    description: `Fetch live backlink data from the MOZ API. Returns source pages, anchor text, and domain authority for backlinks pointing to a given URL.

Example response:
{
  "backlinks": [
    {
      "source_page": "https://other.com/blog",
      "anchor_text": "example link",
      "domain_authority": 72
    }
  ],
  "raw_response": { ... },
  "processed_at": "2026-03-15T12:00:00Z"
}

Use cases:
- Discover which sites link to a given MCP server URL
- Analyze the quality of backlinks (by domain authority)
- Research link profiles for SEO analysis`,
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: PARAM_DESCRIPTIONS.url },
        scope: {
          type: 'string',
          enum: ['url', 'domain', 'subdomain'],
          description: PARAM_DESCRIPTIONS.scope,
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 50,
          description: PARAM_DESCRIPTIONS.limit,
        },
      },
      required: ['url'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetMozBacklinksSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getMozBacklinks({
          url: validatedArgs.url,
          scope: validatedArgs.scope,
          limit: validatedArgs.limit,
        });

        let content = `**MOZ Backlinks for ${validatedArgs.url}**`;
        if (validatedArgs.scope) {
          content += ` (scope: ${validatedArgs.scope})`;
        }
        content += '\n\n';

        if (response.backlinks.length === 0) {
          content += 'No backlinks found.\n';
        } else {
          content += `Found ${response.backlinks.length} backlink(s):\n\n`;
          for (const [index, backlink] of response.backlinks.entries()) {
            content += `${index + 1}. **${backlink.source_page || 'Unknown source'}**\n`;
            if (backlink.anchor_text) content += `   Anchor text: "${backlink.anchor_text}"\n`;
            if (backlink.domain_authority !== undefined)
              content += `   Domain Authority: ${backlink.domain_authority}\n`;

            // Include any additional fields
            const knownKeys = ['source_page', 'anchor_text', 'domain_authority'];
            const extraKeys = Object.keys(backlink).filter((k) => !knownKeys.includes(k));
            for (const key of extraKeys) {
              content += `   ${key}: ${JSON.stringify(backlink[key])}\n`;
            }
            content += '\n';
          }
        }

        content += `**Processed at:** ${response.processed_at}`;

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching MOZ backlinks: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
