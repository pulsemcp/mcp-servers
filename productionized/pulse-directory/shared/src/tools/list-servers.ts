/**
 * Tool for listing MCP servers from the PulseMCP directory
 */

import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../client.js';

const PARAM_DESCRIPTIONS = {
  limit:
    'Maximum number of servers to return (1-100). Default: 30. Use pagination with cursor for more results.',
  cursor:
    'Pagination cursor from a previous response. Use this to get the next page of results when nextCursor is returned.',
  search:
    'Search term to filter servers. Searches server names and descriptions. Example: "github", "slack".',
} as const;

const listServersArgsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(30).describe(PARAM_DESCRIPTIONS.limit),
  cursor: z.string().optional().describe(PARAM_DESCRIPTIONS.cursor),
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
});

function formatServerList(
  servers: Array<{
    name: string;
    description?: string;
    url?: string;
    repository?: string;
    version?: string;
    [key: string]: unknown;
  }>,
  nextCursor?: string,
  totalCount?: number
): string {
  const lines: string[] = [];

  lines.push(
    `Found ${servers.length} servers${totalCount ? ` (${totalCount} total in page)` : ''}:`
  );
  lines.push('');

  for (const server of servers) {
    lines.push(`## ${server.name}`);

    if (server.description) {
      lines.push(server.description);
    }

    if (server.version) {
      lines.push(`- **Version**: ${server.version}`);
    }

    if (server.url) {
      lines.push(`- **URL**: ${server.url}`);
    }

    if (server.repository) {
      lines.push(`- **Repository**: ${server.repository}`);
    }

    lines.push('');
  }

  if (nextCursor) {
    lines.push('---');
    lines.push(`More results available. Use cursor: "${nextCursor}" to get the next page.`);
  }

  return lines.join('\n');
}

export function listServersTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_servers',
    description:
      'Browse MCP servers from the PulseMCP directory. Returns a paginated list of servers with their names, descriptions, and metadata. Use search to filter by name or description. Use cursor for pagination through large result sets.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.limit,
          default: 30,
          minimum: 1,
          maximum: 100,
        },
        cursor: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.cursor,
        },
        search: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.search,
        },
      },
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = listServersArgsSchema.parse(args);
        const client = clientFactory();

        const response = await client.listServers({
          limit: validatedArgs.limit,
          cursor: validatedArgs.cursor,
          search: validatedArgs.search,
        });

        const formattedOutput = formatServerList(
          response.servers,
          response.metadata.nextCursor,
          response.metadata.count
        );

        return {
          content: [
            {
              type: 'text',
              text: formattedOutput,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [
            {
              type: 'text',
              text: `Error listing servers: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
