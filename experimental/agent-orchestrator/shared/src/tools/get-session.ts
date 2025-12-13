import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Session, Log, SubagentTranscript } from '../types.js';

const PARAM_DESCRIPTIONS = {
  id: 'Session ID (numeric) or slug (string). Examples: "1", "fix-auth-bug-20250115"',
  include_transcript:
    'Include the full transcript of the session. Default: false. Set to true for complete conversation history.',
  include_logs:
    'Include logs for the session. Default: false. Use logs_page and logs_per_page for pagination.',
  logs_page: 'Page number for logs pagination. Default: 1',
  logs_per_page: 'Number of logs per page (1-100). Default: 25',
  include_subagent_transcripts:
    'Include subagent transcripts for the session. Default: false. Use transcripts_page and transcripts_per_page for pagination.',
  transcripts_page: 'Page number for subagent transcripts pagination. Default: 1',
  transcripts_per_page: 'Number of subagent transcripts per page (1-100). Default: 25',
} as const;

export const GetSessionSchema = z.object({
  id: z.union([z.string(), z.number()]).describe(PARAM_DESCRIPTIONS.id),
  include_transcript: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_transcript),
  include_logs: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_logs),
  logs_page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.logs_page),
  logs_per_page: z.number().min(1).max(100).optional().describe(PARAM_DESCRIPTIONS.logs_per_page),
  include_subagent_transcripts: z
    .boolean()
    .optional()
    .describe(PARAM_DESCRIPTIONS.include_subagent_transcripts),
  transcripts_page: z.number().min(1).optional().describe(PARAM_DESCRIPTIONS.transcripts_page),
  transcripts_per_page: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe(PARAM_DESCRIPTIONS.transcripts_per_page),
});

const TOOL_DESCRIPTION = `Get detailed information about a specific agent session.

**Returns:** Complete session details including status, configuration, metadata, and optionally:
- Full session transcript
- Session logs (paginated)
- Subagent transcripts (paginated)

**Use cases:**
- View detailed session information
- Check session status and progress
- Retrieve session transcript for review
- Review logs for debugging
- Inspect subagent transcripts`;

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

function formatLogs(
  logs: Log[],
  pagination: { page: number; total_pages: number; total_count: number }
): string {
  const lines = [
    '',
    '---',
    `### Logs (${pagination.total_count} total, page ${pagination.page} of ${pagination.total_pages})`,
    '',
  ];

  if (logs.length === 0) {
    lines.push('No logs found.');
  } else {
    logs.forEach((log) => {
      const levelIcons: Record<string, string> = {
        debug: '🔍',
        info: 'ℹ️',
        warning: '⚠️',
        error: '❌',
        verbose: '📝',
      };
      const icon = levelIcons[log.level] || '📝';
      lines.push(`${icon} **[${log.level.toUpperCase()}]** ${log.created_at}`);
      lines.push(`   ${log.content}`);
      lines.push('');
    });
  }

  if (pagination.page < pagination.total_pages) {
    lines.push(`*More logs available. Use logs_page=${pagination.page + 1} to see the next page.*`);
  }

  return lines.join('\n');
}

function formatSubagentTranscripts(
  transcripts: SubagentTranscript[],
  pagination: { page: number; total_pages: number; total_count: number }
): string {
  const lines = [
    '',
    '---',
    `### Subagent Transcripts (${pagination.total_count} total, page ${pagination.page} of ${pagination.total_pages})`,
    '',
  ];

  if (transcripts.length === 0) {
    lines.push('No subagent transcripts found.');
  } else {
    transcripts.forEach((transcript) => {
      const statusIcons: Record<string, string> = {
        running: '🔄',
        completed: '✅',
        failed: '❌',
      };
      const icon = transcript.status ? statusIcons[transcript.status] || '📝' : '📝';
      const label = transcript.display_label || transcript.agent_id;
      const statusText = transcript.status || 'unknown';
      lines.push(`${icon} **${label}** (${statusText})`);
      if (transcript.description) lines.push(`   ${transcript.description}`);
      if (transcript.subagent_type) lines.push(`   Type: ${transcript.subagent_type}`);
      lines.push(`   Created: ${transcript.created_at}`);
      lines.push('');
    });
  }

  if (pagination.page < pagination.total_pages) {
    lines.push(
      `*More transcripts available. Use transcripts_page=${pagination.page + 1} to see the next page.*`
    );
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
        include_logs: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_logs,
        },
        logs_page: {
          type: 'number',
          minimum: 1,
          description: PARAM_DESCRIPTIONS.logs_page,
        },
        logs_per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.logs_per_page,
        },
        include_subagent_transcripts: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_subagent_transcripts,
        },
        transcripts_page: {
          type: 'number',
          minimum: 1,
          description: PARAM_DESCRIPTIONS.transcripts_page,
        },
        transcripts_per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: PARAM_DESCRIPTIONS.transcripts_per_page,
        },
      },
      required: ['id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetSessionSchema.parse(args);
        const client = clientFactory();

        // Get session details
        const session = await client.getSession(validatedArgs.id, validatedArgs.include_transcript);

        let output = formatSessionDetails(session, validatedArgs.include_transcript || false);

        // Get logs if requested
        if (validatedArgs.include_logs) {
          const logsResponse = await client.listLogs(session.id, {
            page: validatedArgs.logs_page,
            per_page: validatedArgs.logs_per_page,
          });
          output += formatLogs(logsResponse.logs, logsResponse.pagination);
        }

        // Get subagent transcripts if requested
        if (validatedArgs.include_subagent_transcripts) {
          const transcriptsResponse = await client.listSubagentTranscripts(session.id, {
            page: validatedArgs.transcripts_page,
            per_page: validatedArgs.transcripts_per_page,
          });
          output += formatSubagentTranscripts(
            transcriptsResponse.subagent_transcripts,
            transcriptsResponse.pagination
          );
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
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
