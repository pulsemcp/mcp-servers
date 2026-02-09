import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  idOrUrl: 'The deployment ID (e.g., "dpl_abc123") or URL to get build logs for.',
  direction:
    'Order of events. "forward" (oldest first) or "backward" (newest first). Default: "forward".',
  limit: 'Maximum number of events to return. Use -1 for all events. Default: 100.',
} as const;

const GetDeploymentEventsSchema = z.object({
  idOrUrl: z.string().min(1).describe(PARAM_DESCRIPTIONS.idOrUrl),
  direction: z
    .enum(['forward', 'backward'])
    .optional()
    .default('forward')
    .describe(PARAM_DESCRIPTIONS.direction),
  limit: z.number().optional().default(100).describe(PARAM_DESCRIPTIONS.limit),
});

const TOOL_DESCRIPTION = `Get build logs (events) for a Vercel deployment.

Returns the build output events including commands run, stdout/stderr output, and deployment state changes. Use this to debug build failures or review the build process.

**Example response:**
\`\`\`json
[
  { "type": "command", "created": 1700000000000, "payload": { "text": "npm run build" } },
  { "type": "stdout", "created": 1700000001000, "payload": { "text": "Build completed" } },
  { "type": "deployment-state", "created": 1700000002000, "payload": { "text": "READY" } }
]
\`\`\`

**Event types:** command, stdout, stderr, exit, deployment-state, delimiter

**Use cases:**
- Debug why a deployment build failed
- Review build output and timings
- Check which commands were executed during the build
- Monitor deployment state transitions`;

export function getDeploymentEventsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_deployment_events',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        idOrUrl: { type: 'string', description: PARAM_DESCRIPTIONS.idOrUrl },
        direction: {
          type: 'string',
          enum: ['forward', 'backward'],
          default: 'forward',
          description: PARAM_DESCRIPTIONS.direction,
        },
        limit: { type: 'number', default: 100, description: PARAM_DESCRIPTIONS.limit },
      },
      required: ['idOrUrl'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetDeploymentEventsSchema.parse(args);
        const client = clientFactory();
        const result = await client.getDeploymentEvents(validatedArgs.idOrUrl, {
          direction: validatedArgs.direction,
          limit: validatedArgs.limit,
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting deployment events: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
