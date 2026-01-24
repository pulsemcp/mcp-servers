/**
 * Tool for listing MCP servers from the PulseMCP Sub-Registry
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
  updated_since:
    'ISO 8601 timestamp to filter servers updated after this date. Example: "2024-01-01T00:00:00Z".',
  exclude_fields:
    'Array of dot-notation paths to exclude from the response. Reduces context size by removing unnecessary fields. Examples: ["servers[].server.packages", "servers[].server.remotes", "servers[]._meta"].',
} as const;

const listServersArgsSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(30).describe(PARAM_DESCRIPTIONS.limit),
  cursor: z.string().optional().describe(PARAM_DESCRIPTIONS.cursor),
  search: z.string().optional().describe(PARAM_DESCRIPTIONS.search),
  updated_since: z.string().optional().describe(PARAM_DESCRIPTIONS.updated_since),
  exclude_fields: z.array(z.string()).optional().describe(PARAM_DESCRIPTIONS.exclude_fields),
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
 * Recursively deletes a field from an object using dot-notation path.
 * Supports array notation with [] to apply to all array elements.
 * Examples:
 *   - "servers[].server.packages" -> deletes packages from each server in servers array
 *   - "servers[]._meta" -> deletes _meta from each server entry
 *   - "metadata.nextCursor" -> deletes nextCursor from metadata
 */
function deleteFieldByPath(obj: unknown, path: string): void {
  if (!obj || typeof obj !== 'object') return;

  const parts = path.split('.');
  if (parts.length === 0) return;

  const firstPart = parts[0];
  const remainingPath = parts.slice(1).join('.');

  // Handle array notation: "servers[]" means apply to all elements
  if (firstPart.endsWith('[]')) {
    const arrayKey = firstPart.slice(0, -2);
    const arr = (obj as Record<string, unknown>)[arrayKey];
    if (Array.isArray(arr)) {
      if (remainingPath) {
        // Apply remaining path to each element
        for (const item of arr) {
          deleteFieldByPath(item, remainingPath);
        }
      }
    }
  } else if (remainingPath) {
    // Recurse into nested object
    deleteFieldByPath((obj as Record<string, unknown>)[firstPart], remainingPath);
  } else {
    // Delete the field
    delete (obj as Record<string, unknown>)[firstPart];
  }
}

/**
 * Applies field exclusions to the response object.
 */
function applyExclusions(
  response: ListServersResponse,
  excludeFields?: string[]
): ListServersResponse {
  if (!excludeFields || excludeFields.length === 0) {
    return response;
  }

  // Deep clone to avoid mutating original
  const cloned = JSON.parse(JSON.stringify(response)) as ListServersResponse;

  for (const path of excludeFields) {
    deleteFieldByPath(cloned, path);
  }

  return cloned;
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
        exclude_fields: {
          type: 'array',
          items: { type: 'string' },
          description: PARAM_DESCRIPTIONS.exclude_fields,
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

        const filteredResponse = applyExclusions(response, validatedArgs.exclude_fields);
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
