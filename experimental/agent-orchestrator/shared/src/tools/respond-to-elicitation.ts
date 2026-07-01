import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const PARAM_DESCRIPTIONS = {
  request_id:
    'The elicitation `request_id` — the public identifier the MCP server assigned when it created the elicitation (the `com.pulsemcp/request-id` value, surfaced in the poll URL). This is NOT the database primary key.',
  action_type:
    'How to resolve the elicitation. "accept" approves the request and lets the paused MCP flow continue (optionally with structured `content`); "decline" rejects it and unblocks the flow with a declined outcome.',
  content:
    'Optional structured JSON object supplied with an "accept" response (e.g. the form fields the elicitation requested). Ignored for "decline". Must be a JSON object, not a scalar or array.',
} as const;

export const RespondToElicitationSchema = z.object({
  request_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.request_id),
  action_type: z.enum(['accept', 'decline']).describe(PARAM_DESCRIPTIONS.action_type),
  content: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.content),
});

const TOOL_DESCRIPTION = `Respond to a pending Agent Orchestrator elicitation request — programmatically accept or decline it so the paused MCP flow that is waiting on it can continue.

**Context:** When an MCP server needs human approval (e.g. a write-class action), it creates an *elicitation* and blocks, polling Agent Orchestrator until someone responds. Normally a human clicks "accept" / "decline" in the AO web UI. This tool exposes that same resolution over the API, so an agent or automated test can unblock the flow without a human in the loop.

**What it does:**
- Looks up the elicitation by its public \`request_id\` (the \`com.pulsemcp/request-id\` identifier, not the DB primary key).
- Records an \`accept\` (optionally with a structured \`content\` payload) or \`decline\`.
- Returns the elicitation's resulting poll-response so you can confirm the outcome.

**Example response:**
\`\`\`
## Elicitation Accepted

- **Request ID:** req-abc123
- **Action:** accept
- **Content:** { "approved": true }
\`\`\`

**Enum — action_type:**
- **accept** — Approve the request; the waiting MCP flow proceeds. Pass optional \`content\` to supply the structured data the elicitation asked for.
- **decline** — Reject the request; the waiting MCP flow unblocks with a declined outcome. \`content\` is ignored.

**Use cases:**
- Closed-loop testing of an MCP server's elicitation-gated behavior without a human clicking in the UI.
- Automating approval of a known, expected elicitation as part of a larger orchestrated task.

**Errors:**
- Unknown \`request_id\` → 404 (elicitation not found).
- Elicitation already resolved / not pending, or an invalid \`action_type\` → 422.`;

export function respondToElicitationTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'respond_to_elicitation',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        request_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.request_id,
        },
        action_type: {
          type: 'string',
          enum: ['accept', 'decline'],
          description: PARAM_DESCRIPTIONS.action_type,
        },
        content: {
          type: 'object',
          description: PARAM_DESCRIPTIONS.content,
        },
      },
      required: ['request_id', 'action_type'],
    },
    handler: async (args: unknown) => {
      try {
        const { request_id, action_type, content } = RespondToElicitationSchema.parse(args);
        const client = clientFactory();

        const response = await client.respondToElicitation(request_id, action_type, content);

        const lines = [
          `## Elicitation ${action_type === 'accept' ? 'Accepted' : 'Declined'}`,
          '',
          `- **Request ID:** ${request_id}`,
          `- **Action:** ${response.action}`,
        ];

        if (response.content != null) {
          lines.push(`- **Content:** ${JSON.stringify(response.content)}`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error responding to elicitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
