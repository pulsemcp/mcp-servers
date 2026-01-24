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

function formatServerDetails(server: {
  name: string;
  title?: string;
  description?: string;
  websiteUrl?: string;
  repository?: { url?: string; source?: string } | string;
  version?: string;
  [key: string]: unknown;
}): string {
  const lines: string[] = [];

  // Use title if available, otherwise fall back to name
  const displayName = server.title || server.name;
  lines.push(`# ${displayName}`);
  lines.push(`**ID**: \`${server.name}\``);
  lines.push('');

  if (server.description) {
    lines.push(server.description);
    lines.push('');
  }

  lines.push('## Details');
  lines.push('');

  if (server.version) {
    lines.push(`- **Version**: ${server.version}`);
  }

  if (server.websiteUrl) {
    lines.push(`- **Website**: ${server.websiteUrl}`);
  }

  // Handle repository as either object or string
  if (server.repository) {
    const repoUrl =
      typeof server.repository === 'object' ? server.repository.url : server.repository;
    if (repoUrl) {
      lines.push(`- **Repository**: ${repoUrl}`);
    }
  }

  // Include any other fields from the server object
  const knownFields = [
    'name',
    'title',
    'description',
    'websiteUrl',
    'repository',
    'version',
    '$schema',
    'packages',
    'remotes',
  ];
  const additionalFields = Object.entries(server).filter(
    ([key, value]) => !knownFields.includes(key) && value !== undefined && value !== null
  );

  if (additionalFields.length > 0) {
    lines.push('');
    lines.push('## Additional Information');
    lines.push('');

    for (const [key, value] of additionalFields) {
      const formattedValue =
        typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      lines.push(`- **${key}**: ${formattedValue}`);
    }
  }

  return lines.join('\n');
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

        const formattedOutput = formatServerDetails(response.server);

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
              text: `Error getting server details: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
