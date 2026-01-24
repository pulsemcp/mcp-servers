/**
 * Tool for listing MCP servers from the PulseMCP Sub-Registry
 */

import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../client.js';
import { truncateStrings, deepClone } from '../utils/truncation.js';

const PARAM_DESCRIPTIONS = {
  limit:
    'Maximum number of servers to return (1-100). Default: 30. Use pagination with cursor for more results.',
  cursor:
    'Pagination cursor from a previous response. Use this to get the next page of results when nextCursor is returned.',
  search:
    'Search term to filter servers. Searches server names and titles. Example: "github", "slack".',
  updated_since:
    'ISO 8601 timestamp to filter servers updated after this date. Example: "2024-01-01T00:00:00Z".',
  expand_fields:
    'Array of dot-notation paths to show in full (not truncated). By default, strings longer than 200 characters are truncated. Use this to expand specific fields. Examples: ["servers[].server.description", "servers[].server.readme"].',
} as const;

const listServersArgsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(30).describe(PARAM_DESCRIPTIONS.limit),
  cursor: z.string().optional().describe(PARAM_DESCRIPTIONS.cursor),
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
  updated_since: z.string().optional().describe(PARAM_DESCRIPTIONS.updated_since),
  expand_fields: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.expand_fields),
});

interface ServerEntry {
  server: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

interface ListServersResponse {
  servers: ServerEntry[];
  metadata: {
    count?: number;
    nextCursor?: string;
  };
}

/**
 * Applies truncation to the response, expanding specified fields.
 */
function applyTruncation(
  response: ListServersResponse,
  expandFields?: string[]
): ListServersResponse {
  // Deep clone to avoid mutating original
  const cloned = deepClone(response);
  return truncateStrings(cloned, expandFields || []) as ListServersResponse;
}

function formatServerListAsJson(response: ListServersResponse): string {
  return JSON.stringify(response, null, 2);
}

export function listServersTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_servers',
    description:
      'Browse MCP servers from the PulseMCP Sub-Registry. Returns a paginated list of servers with their names, descriptions, and metadata. Use search to filter by name or description. Use cursor for pagination through large result sets.',
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
        updated_since: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.updated_since,
        },
        expand_fields: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.expand_fields,
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
          updatedSince: validatedArgs.updated_since,
        });

        const filteredResponse = applyTruncation(response, validatedArgs.expand_fields);
        const jsonOutput = formatServerListAsJson(filteredResponse);

        return {
          content: [
            {
              type: 'text',
              text: jsonOutput,
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
