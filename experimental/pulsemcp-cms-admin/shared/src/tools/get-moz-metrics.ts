import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  url: 'The URL to fetch MOZ metrics for. Must be a valid HTTP/HTTPS URL.',
  scope:
    'Scope of the metrics lookup: "url" (exact URL, default), "domain" (entire root domain), or "subdomain" (specific subdomain)',
} as const;

const GetMozMetricsSchema = z.object({
  url: z.string().describe(PARAM_DESCRIPTIONS.url),
  scope: z.enum(['url', 'domain', 'subdomain']).optional().describe(PARAM_DESCRIPTIONS.scope),
});

export function getMozMetrics(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_moz_metrics',
    description: `Fetch live URL metrics from the MOZ API. Returns page authority, domain authority, spam score, and link counts for a given URL.

Example response:
{
  "metrics": {
    "page_authority": 88,
    "domain_authority": 95,
    "spam_score": 1,
    "root_domains_to_page": 441855
  },
  "raw_response": { ... },
  "processed_at": "2026-03-15T12:00:00Z"
}

Use cases:
- Check the authority and spam score of a URL
- Compare domain authority across different MCP server websites
- Evaluate the SEO strength of a page or domain`,
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: PARAM_DESCRIPTIONS.url },
        scope: {
          type: 'string',
          enum: ['url', 'domain', 'subdomain'],
          description: PARAM_DESCRIPTIONS.scope,
        },
      },
      required: ['url'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetMozMetricsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getMozMetrics({
          url: validatedArgs.url,
          scope: validatedArgs.scope,
        });

        let content = `**MOZ Metrics for ${validatedArgs.url}**`;
        if (validatedArgs.scope) {
          content += ` (scope: ${validatedArgs.scope})`;
        }
        content += '\n\n';

        const m = response.metrics;
        if (m.page_authority !== undefined) content += `**Page Authority:** ${m.page_authority}\n`;
        if (m.domain_authority !== undefined)
          content += `**Domain Authority:** ${m.domain_authority}\n`;
        if (m.spam_score !== undefined) content += `**Spam Score:** ${m.spam_score}\n`;
        if (m.root_domains_to_page !== undefined)
          content += `**Root Domains to Page:** ${m.root_domains_to_page}\n`;

        content += `\n**Processed at:** ${response.processed_at}\n`;

        // Include any additional metrics
        const knownKeys = [
          'page_authority',
          'domain_authority',
          'spam_score',
          'root_domains_to_page',
        ];
        const extraKeys = Object.keys(m).filter((k) => !knownKeys.includes(k));
        if (extraKeys.length > 0) {
          content += '\n**Additional metrics:**\n';
          for (const key of extraKeys) {
            content += `- ${key}: ${JSON.stringify(m[key])}\n`;
          }
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching MOZ metrics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
