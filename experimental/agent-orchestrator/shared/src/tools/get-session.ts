import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Session } from '../types.js';

const PARAM_DESCRIPTIONS = {
  id: 'Session ID (numeric) or slug (string). Examples: "1", "fix-auth-bug-20250115"',
  include_transcript:
    'Include the full transcript of the session. Default: false. Set to true for complete conversation history.',
} as const;

export const GetSessionSchema = z.object({
  id: z.union([z.string(), z.number()]).describe(PARAM_DESCRIPTIONS.id),
  include_transcript: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_transcript),
});

const TOOL_DESCRIPTION = `Get detailed information about a specific agent session.

**Returns:** Complete session details including status, configuration, metadata, and optionally the full transcript.

**Use cases:**
- View detailed session information
- Check session status and progress
- Retrieve session transcript for review
- Debug session issues`;

function formatSessionDetails(session: Session, includeTranscript: boolean): string {
  const lines = [
    `## Session: ${session.title}`,
    '',
    '### Basic Information',
    `- **ID:** ${session.id}`,
    `- **Status:** ${session.status}`,
    `- **Agent Type:** ${session.agent_type}`,
  ];

  if (session.slug) lines.push(`- **Slug:** ${session.slug}`);

  lines.push('');
  lines.push('### Git Configuration');
  if (session.git_root) lines.push(`- **Repository:** ${session.git_root}`);
  if (session.branch) lines.push(`- **Branch:** ${session.branch}`);
  if (session.subdirectory) lines.push(`- **Subdirectory:** ${session.subdirectory}`);

  lines.push('');
  lines.push('### Execution');
  lines.push(`- **Execution Provider:** ${session.execution_provider}`);
  if (session.stop_condition) lines.push(`- **Stop Condition:** ${session.stop_condition}`);
  if (session.mcp_servers && session.mcp_servers.length > 0) {
    lines.push(`- **MCP Servers:** ${session.mcp_servers.join(', ')}`);
  }

  if (session.prompt) {
    lines.push('');
    lines.push('### Current Prompt');
    lines.push('```');
    lines.push(session.prompt);
    lines.push('```');
  }

  lines.push('');
  lines.push('### Job Information');
  if (session.session_id) lines.push(`- **Claude Session ID:** ${session.session_id}`);
  if (session.job_id) lines.push(`- **Initial Job ID:** ${session.job_id}`);
  if (session.running_job_id) lines.push(`- **Running Job ID:** ${session.running_job_id}`);

  if (Object.keys(session.metadata).length > 0) {
    lines.push('');
    lines.push('### System Metadata');
    lines.push('```json');
    lines.push(JSON.stringify(session.metadata, null, 2));
    lines.push('```');
  }

  if (Object.keys(session.custom_metadata).length > 0) {
    lines.push('');
    lines.push('### Custom Metadata');
    lines.push('```json');
    lines.push(JSON.stringify(session.custom_metadata, null, 2));
    lines.push('```');
  }

  lines.push('');
  lines.push('### Timestamps');
  lines.push(`- **Created:** ${session.created_at}`);
  lines.push(`- **Updated:** ${session.updated_at}`);
  if (session.archived_at) lines.push(`- **Archived:** ${session.archived_at}`);

  if (includeTranscript && session.transcript) {
    lines.push('');
    lines.push('### Transcript');
    lines.push('```');
    lines.push(session.transcript);
    lines.push('```');
  }

  return lines.join('\n');
}

export function getSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'get_session',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: PARAM_DESCRIPTIONS.id,
        },
        include_transcript: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_transcript,
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetSessionSchema.parse(args);
        const client = clientFactory();

        const session = await client.getSession(validatedArgs.id, validatedArgs.include_transcript);

        return {
          content: [
            {
              type: 'text',
              text: formatSessionDetails(session, validatedArgs.include_transcript || false),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
