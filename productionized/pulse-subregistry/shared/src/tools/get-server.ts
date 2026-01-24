/**
 * Tool for getting detailed information about a specific MCP server
 */

import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../client.js';

const PARAM_DESCRIPTIONS = {
  server_name:
    'The name of the server to look up. This is the unique identifier for the server in the PulseMCP Sub-Registry. Example: "@anthropic/mcp-server-filesystem".',
  version:
    'Specific version to retrieve. Use "latest" (default) to get the most recent version, or specify a semver version like "1.0.0".',
} as const;

const getServerArgsSchema = z.object({
  server_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.server_name),
  version: z.string().optional().default('latest').describe(PARAM_DESCRIPTIONS.version),
});

interface GetServerResponse {
  server: Record<string, unknown>;
  _meta?: Record<string, unknown>;
}

function formatServerDetailsAsJson(response: GetServerResponse): string {
  return JSON.stringify(response, null, 2);
}

export function getServerTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_server',
    description:
      'Get detailed information about a specific MCP server from the PulseMCP Sub-Registry. Returns the server\'s metadata, description, repository URL, and other available information. Use "latest" version (default) or specify a specific version number.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        server_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.server_name,
        },
        version: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.version,
          default: 'latest',
        },
      },
      required: ['server_name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = getServerArgsSchema.parse(args);
        const client = clientFactory();

        const response = await client.getServer({
          serverName: validatedArgs.server_name,
          version: validatedArgs.version,
        });

        const jsonOutput = formatServerDetailsAsJson(response);

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
              text: `Error getting server details: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
