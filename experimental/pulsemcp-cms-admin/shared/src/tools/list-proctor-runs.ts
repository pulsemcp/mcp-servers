import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  q: 'Search by server slug, implementation name, or mirror name',
  recommended:
    'When true, filter to recommended servers only. When false or omitted, shows all servers',
  tenant_ids: 'Comma-separated tenant IDs to filter by (OR logic)',
  sort: 'Column to sort by: slug, name, mirrors, recommended, tenants, latest_tested, last_auth_check, last_tools_list',
  direction: 'Sort direction: asc or desc. Default: asc',
  limit: 'Results per page, range 1-100. Default: 30',
  offset: 'Pagination offset. Default: 0',
} as const;

const ListProctorRunsSchema = z.object({
  q: z.string().optional().describe(PARAM_DESCRIPTIONS.q),
  recommended: z.boolean().optional().describe(PARAM_DESCRIPTIONS.recommended),
  tenant_ids: z.string().optional().describe(PARAM_DESCRIPTIONS.tenant_ids),
  sort: z
    .enum([
      'slug',
      'name',
      'mirrors',
      'recommended',
      'tenants',
      'latest_tested',
      'last_auth_check',
      'last_tools_list',
    ])
    .optional()
    .describe(PARAM_DESCRIPTIONS.sort),
  direction: z.enum(['asc', 'desc']).optional().describe(PARAM_DESCRIPTIONS.direction),
  limit: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.limit),
  offset: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.offset),
});

export function listProctorRuns(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_proctor_runs',
    description: `List proctor run summaries for MCP servers. Shows testing status across all servers including auth-check and tools-list exam results. Useful for identifying untested servers or servers that need re-testing.

Default sort order: untested servers first, then stalest auth check, then stalest tools list, then alphabetical by slug.

Example response:
{
  "runs": [
    {
      "id": 123,
      "slug": "some-server",
      "name": "Some Server",
      "recommended": true,
      "mirrors_count": 2,
      "latest_tested": true,
      "last_auth_check_days": 2,
      "last_tools_list_days": 3,
      "auth_types": ["oauth2"],
      "num_tools": 5,
      "packages": ["npm"],
      "remotes": ["streamable-http"]
    }
  ],
  "pagination": { "current_page": 1, "total_pages": 2, "total_count": 45, "has_next": true }
}

Use cases:
- Find servers that haven't been tested yet (untested appear first by default)
- Check which servers have stale proctor results
- Filter to recommended servers to prioritize testing
- Search for a specific server's testing status`,
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: PARAM_DESCRIPTIONS.q },
        recommended: { type: 'boolean', description: PARAM_DESCRIPTIONS.recommended },
        tenant_ids: { type: 'string', description: PARAM_DESCRIPTIONS.tenant_ids },
        sort: {
          type: 'string',
          enum: [
            'slug',
            'name',
            'mirrors',
            'recommended',
            'tenants',
            'latest_tested',
            'last_auth_check',
            'last_tools_list',
          ],
          description: PARAM_DESCRIPTIONS.sort,
        },
        direction: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: PARAM_DESCRIPTIONS.direction,
        },
        limit: { type: 'number', minimum: 1, maximum: 100, description: PARAM_DESCRIPTIONS.limit },
        offset: { type: 'number', minimum: 0, description: PARAM_DESCRIPTIONS.offset },
      },
    },
    handler: async (args: unknown) => {
      const validatedArgs = ListProctorRunsSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.getProctorRuns({
          q: validatedArgs.q,
          recommended: validatedArgs.recommended,
          tenant_ids: validatedArgs.tenant_ids,
          sort: validatedArgs.sort,
          direction: validatedArgs.direction,
          limit: validatedArgs.limit,
          offset: validatedArgs.offset,
        });

        let content = `Found ${response.runs.length} proctor run summaries`;
        if (response.pagination) {
          content += ` (page ${response.pagination.current_page} of ${response.pagination.total_pages}, total: ${response.pagination.total_count})`;
        }
        content += ':\n\n';

        for (const [index, run] of response.runs.entries()) {
          content += `${index + 1}. **${run.slug}**`;
          if (run.name) {
            content += ` — ${run.name}`;
          }
          content += ` (ID: ${run.id})\n`;

          if (run.recommended) {
            content += `   Recommended: yes\n`;
          }
          content += `   Mirrors: ${run.mirrors_count}, Tenants: ${run.tenant_count}\n`;

          if (run.latest_version) {
            content += `   Latest Version: ${run.latest_version}`;
            if (run.latest_mirror_name) {
              content += ` (mirror: ${run.latest_mirror_name}, ID: ${run.latest_mirror_id})`;
            }
            content += '\n';
          }

          content += `   Latest Tested: ${run.latest_tested ? 'yes' : 'no'}\n`;

          if (run.last_auth_check_days !== null) {
            content += `   Last Auth Check: ${run.last_auth_check_days} day(s) ago\n`;
          } else {
            content += `   Last Auth Check: never\n`;
          }

          if (run.last_tools_list_days !== null) {
            content += `   Last Tools List: ${run.last_tools_list_days} day(s) ago\n`;
          } else {
            content += `   Last Tools List: never\n`;
          }

          if (run.auth_types.length > 0) {
            content += `   Auth Types: ${run.auth_types.join(', ')}\n`;
          }

          if (run.num_tools !== null) {
            content += `   Num Tools: ${run.num_tools}\n`;
          }

          if (run.packages.length > 0) {
            content += `   Packages: ${run.packages.join(', ')}\n`;
          }

          if (run.remotes.length > 0) {
            content += `   Remotes: ${run.remotes.join(', ')}\n`;
          }

          if (run.known_missing_init_tools_list) {
            content += `   Known Missing Init Tools List: yes\n`;
          }

          if (run.known_missing_auth_check) {
            content += `   Known Missing Auth Check: yes\n`;
          }

          content += '\n';
        }

        return { content: [{ type: 'text', text: content.trim() }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching proctor runs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
