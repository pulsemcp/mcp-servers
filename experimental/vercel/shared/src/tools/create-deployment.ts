import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  name: 'The project name for the deployment (used in the deployment URL). Example: "my-app"',
  target:
    'Deployment target environment. Options: "production", "preview", "staging". ' +
    'Default: "preview" if not specified.',
  deploymentId:
    'ID of a previous deployment to redeploy. The new deployment will use the same source. ' +
    'Example: "dpl_abc123"',
  gitRef: 'Git branch or tag to deploy from. Example: "main", "feature/new-ui"',
  gitRepoId: 'Git repository ID (from Vercel project settings). Required when using gitRef.',
  gitType:
    'Git provider type. Options: "github", "gitlab", "bitbucket". Required when using gitRef.',
} as const;

const CreateDeploymentSchema = z
  .object({
    name: z.string().min(1).describe(PARAM_DESCRIPTIONS.name),
    target: z
      .enum(['production', 'preview', 'staging'])
      .optional()
      .describe(PARAM_DESCRIPTIONS.target),
    deploymentId: z.string().optional().describe(PARAM_DESCRIPTIONS.deploymentId),
    gitRef: z.string().optional().describe(PARAM_DESCRIPTIONS.gitRef),
    gitRepoId: z.string().optional().describe(PARAM_DESCRIPTIONS.gitRepoId),
    gitType: z
      .enum(['github', 'gitlab', 'bitbucket'])
      .optional()
      .describe(PARAM_DESCRIPTIONS.gitType),
  })
  .refine(
    (data) => {
      const gitFields = [data.gitRef, data.gitRepoId, data.gitType];
      const provided = gitFields.filter(Boolean).length;
      return provided === 0 || provided === 3;
    },
    {
      message: 'gitRef, gitRepoId, and gitType must all be provided together',
    }
  );

const TOOL_DESCRIPTION = `Create a new Vercel deployment or redeploy an existing one.

Can create deployments from a git source or by redeploying a previous deployment ID. Returns the newly created deployment with its ID, URL, and initial state.

**Example response:**
\`\`\`json
{
  "uid": "dpl_new789",
  "name": "my-app",
  "url": "my-app-new789.vercel.app",
  "state": "BUILDING",
  "target": "production",
  "created": 1700000000000
}
\`\`\`

**Use cases:**
- Redeploy a previous deployment to the same or different target
- Trigger a new deployment from a specific git branch
- Create a preview deployment for testing
- Deploy to production after verifying a preview`;

export function createDeploymentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_deployment',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: PARAM_DESCRIPTIONS.name },
        target: {
          type: 'string',
          enum: ['production', 'preview', 'staging'],
          description: PARAM_DESCRIPTIONS.target,
        },
        deploymentId: { type: 'string', description: PARAM_DESCRIPTIONS.deploymentId },
        gitRef: { type: 'string', description: PARAM_DESCRIPTIONS.gitRef },
        gitRepoId: { type: 'string', description: PARAM_DESCRIPTIONS.gitRepoId },
        gitType: {
          type: 'string',
          enum: ['github', 'gitlab', 'bitbucket'],
          description: PARAM_DESCRIPTIONS.gitType,
        },
      },
      required: ['name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateDeploymentSchema.parse(args);
        const client = clientFactory();

        const options: Parameters<typeof client.createDeployment>[0] = {
          name: validatedArgs.name,
          target: validatedArgs.target,
          deploymentId: validatedArgs.deploymentId,
        };

        if (validatedArgs.gitRef && validatedArgs.gitRepoId && validatedArgs.gitType) {
          options.gitSource = {
            type: validatedArgs.gitType,
            ref: validatedArgs.gitRef,
            repoId: validatedArgs.gitRepoId,
          };
        }

        const result = await client.createDeployment(options);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating deployment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
