import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { SubagentTranscript } from '../types.js';

// ===========================================================================
// List Subagent Transcripts Tool
// ===========================================================================

const LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) to list subagent transcripts from.',
  status: 'Filter by subagent status. Options: "running", "completed", "failed"',
  subagent_type: 'Filter by subagent type. Examples: "explore", "plan", "code-reviewer"',
  page: 'Page number for pagination. Default: 1',
  per_page: 'Number of results per page (1-100). Default: 25',
} as const;

export const ListSubagentTranscriptsSchema = z.object({
  session_id: z
    .union([z.string(), z.number()])
    .describe(LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.session_id),
  status: z
    .enum(['running', 'completed', 'failed'])
    .optional()
    .describe(LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.status),
  subagent_type: z.string().optional().describe(LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.subagent_type),
  page: z.number().min(1).optional().describe(LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.page),
  per_page: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe(LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.per_page),
});

const LIST_TRANSCRIPTS_DESCRIPTION = `List subagent transcripts for a session.

Subagent transcripts store the conversation history of nested agents spawned via the Task tool during session execution.

**Returns:** A paginated list of subagent transcripts with metadata.

**Use cases:**
- Review subagent execution history
- Debug issues with specific subagents
- Analyze subagent performance and token usage`;

function formatTranscript(transcript: SubagentTranscript): string {
  const lines = [
    `### ${transcript.display_label || transcript.description || transcript.agent_id}`,
    '',
    `- **ID:** ${transcript.id}`,
    `- **Agent ID:** ${transcript.agent_id}`,
  ];

  if (transcript.status) lines.push(`- **Status:** ${transcript.status}`);
  if (transcript.subagent_type) lines.push(`- **Type:** ${transcript.subagent_type}`);
  if (transcript.message_count !== null) lines.push(`- **Messages:** ${transcript.message_count}`);
  if (transcript.formatted_duration) lines.push(`- **Duration:** ${transcript.formatted_duration}`);
  if (transcript.formatted_tokens) lines.push(`- **Tokens:** ${transcript.formatted_tokens}`);
  if (transcript.tool_use_count !== null)
    lines.push(`- **Tool Uses:** ${transcript.tool_use_count}`);
  lines.push(`- **Created:** ${transcript.created_at}`);

  return lines.join('\n');
}

export function listSubagentTranscriptsTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'list_subagent_transcripts',
    description: LIST_TRANSCRIPTS_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.session_id,
        },
        status: {
          type: 'string',
          enum: ['running', 'completed', 'failed'],
          description: LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.status,
        },
        subagent_type: {
          type: 'string',
          description: LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.subagent_type,
        },
        page: {
          type: 'number',
          minimum: 1,
          description: LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.page,
        },
        per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: LIST_TRANSCRIPTS_PARAM_DESCRIPTIONS.per_page,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListSubagentTranscriptsSchema.parse(args);
        const client = clientFactory();

        const { session_id, ...options } = validatedArgs;
        const response = await client.listSubagentTranscripts(session_id, options);

        if (response.subagent_transcripts.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No subagent transcripts found for session ${session_id}.`,
              },
            ],
          };
        }

        const lines = [
          `## Subagent Transcripts (Session ${session_id})`,
          '',
          `Found ${response.pagination.total_count} transcript(s) (page ${response.pagination.page} of ${response.pagination.total_pages}):`,
          '',
        ];

        response.subagent_transcripts.forEach((transcript) => {
          lines.push(formatTranscript(transcript));
          lines.push('');
        });

        if (response.pagination.page < response.pagination.total_pages) {
          lines.push('---');
          lines.push(
            `*More transcripts available. Use page=${response.pagination.page + 1} to see the next page.*`
          );
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing subagent transcripts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Get Subagent Transcript Tool
// ===========================================================================

const GET_TRANSCRIPT_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string).',
  transcript_id: 'Subagent transcript ID.',
  include_transcript: 'Include the full JSONL transcript content. Default: false',
} as const;

export const GetSubagentTranscriptSchema = z.object({
  session_id: z
    .union([z.string(), z.number()])
    .describe(GET_TRANSCRIPT_PARAM_DESCRIPTIONS.session_id),
  transcript_id: z.number().describe(GET_TRANSCRIPT_PARAM_DESCRIPTIONS.transcript_id),
  include_transcript: z
    .boolean()
    .optional()
    .describe(GET_TRANSCRIPT_PARAM_DESCRIPTIONS.include_transcript),
});

const GET_TRANSCRIPT_DESCRIPTION = `Get detailed information about a specific subagent transcript.

**Returns:** Complete transcript details including metadata and optionally the full JSONL content.

**Use cases:**
- Review a specific subagent's conversation
- Analyze subagent performance
- Debug subagent issues`;

export function getSubagentTranscriptTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'get_subagent_transcript',
    description: GET_TRANSCRIPT_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: GET_TRANSCRIPT_PARAM_DESCRIPTIONS.session_id,
        },
        transcript_id: {
          type: 'number',
          description: GET_TRANSCRIPT_PARAM_DESCRIPTIONS.transcript_id,
        },
        include_transcript: {
          type: 'boolean',
          description: GET_TRANSCRIPT_PARAM_DESCRIPTIONS.include_transcript,
        },
      },
      required: ['session_id', 'transcript_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetSubagentTranscriptSchema.parse(args);
        const client = clientFactory();

        const transcript = await client.getSubagentTranscript(
          validatedArgs.session_id,
          validatedArgs.transcript_id,
          validatedArgs.include_transcript
        );

        const lines = [
          `## Subagent Transcript Details`,
          '',
          '### Basic Information',
          `- **ID:** ${transcript.id}`,
          `- **Agent ID:** ${transcript.agent_id}`,
          `- **Session ID:** ${transcript.session_id}`,
        ];

        if (transcript.tool_use_id) lines.push(`- **Tool Use ID:** ${transcript.tool_use_id}`);
        if (transcript.status) lines.push(`- **Status:** ${transcript.status}`);
        if (transcript.subagent_type) lines.push(`- **Type:** ${transcript.subagent_type}`);
        if (transcript.description) lines.push(`- **Description:** ${transcript.description}`);
        if (transcript.filename) lines.push(`- **Filename:** ${transcript.filename}`);

        lines.push('');
        lines.push('### Metrics');
        if (transcript.message_count !== null)
          lines.push(`- **Messages:** ${transcript.message_count}`);
        if (transcript.duration_ms !== null) {
          lines.push(
            `- **Duration:** ${transcript.formatted_duration || `${transcript.duration_ms}ms`}`
          );
        }
        if (transcript.total_tokens !== null) {
          lines.push(`- **Tokens:** ${transcript.formatted_tokens || transcript.total_tokens}`);
        }
        if (transcript.tool_use_count !== null)
          lines.push(`- **Tool Uses:** ${transcript.tool_use_count}`);

        lines.push('');
        lines.push('### Timestamps');
        lines.push(`- **Created:** ${transcript.created_at}`);
        lines.push(`- **Updated:** ${transcript.updated_at}`);

        if (validatedArgs.include_transcript && transcript.transcript) {
          lines.push('');
          lines.push('### Transcript Content');
          lines.push('```jsonl');
          lines.push(transcript.transcript);
          lines.push('```');
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting subagent transcript: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
