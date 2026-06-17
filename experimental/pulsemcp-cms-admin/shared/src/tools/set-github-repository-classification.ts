import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const CLASSIFICATION_VALUES = [
  'single_mcp_server',
  'single_mcp_client',
  'multiple_mcp_servers',
  'multiple_mcp_clients',
  'other',
] as const;

const PARAM_DESCRIPTIONS = {
  id: 'The integer id of the GitHub repository record (github_repositories.id).',
  classification: `The classification to set on the GitHub repository. One of: ${CLASSIFICATION_VALUES.join(', ')}.

- single_mcp_server: the repo is a single MCP server (counts toward the gh_stars popularity path).
- single_mcp_client: the repo is a single MCP client.
- multiple_mcp_servers: the repo hosts multiple MCP servers.
- multiple_mcp_clients: the repo hosts multiple MCP clients.
- other: NOT a single MCP server (e.g. a broader platform where MCP is one incidental feature). Setting "other" excludes the repo from the gh_stars popularity path — int_github_repositories.sql maps it to mcp_server_count = 0, dropping it from the normalized downloads estimate.`,
} as const;

const SetGithubRepositoryClassificationSchema = z.object({
  id: z.number().int().describe(PARAM_DESCRIPTIONS.id),
  classification: z.enum(CLASSIFICATION_VALUES).describe(PARAM_DESCRIPTIONS.classification),
});

export function setGithubRepositoryClassification(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'set_github_repository_classification',
    description: `Set the \`classification\` field on a GitHub repository record (github_repositories). Identifies the repository by its integer id.

The primary use case is tagging a repository as \`other\` ("not a single MCP server") so it stops inflating PulseMCP popularity estimates. When a broad platform repo (e.g. heyputer/puter) carries a large GitHub-star count, the gh_stars path overstates MCP adoption; setting \`classification: "other"\` drops the repo out of that path (int_github_repositories.sql maps "other" to mcp_server_count = 0). The corrected estimate propagates on the next BigQuery warehouse rebuild and the subsequent UpdatePopularityEstimatesFromBigqueryJob run.

Example request:
{
  "id": 12345,
  "classification": "other"
}

Use cases:
- Tag a non-MCP-driven platform repo as "other" to exclude it from gh_stars-based popularity
- Correct a misclassified repository (e.g. a client repo tagged as a server)`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: PARAM_DESCRIPTIONS.id },
        classification: {
          type: 'string',
          enum: [...CLASSIFICATION_VALUES],
          description: PARAM_DESCRIPTIONS.classification,
        },
      },
      required: ['id', 'classification'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SetGithubRepositoryClassificationSchema.parse(args);
      const client = clientFactory();

      try {
        const result = await client.setGithubRepositoryClassification(
          validatedArgs.id,
          validatedArgs.classification
        );

        const text = `Updated GitHub repository (id: ${result.id}):
- classification: ${result.classification}`;

        return { content: [{ type: 'text', text }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting github_repository classification: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
