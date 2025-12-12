import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Log } from '../types.js';

// ===========================================================================
// List Logs Tool
// ===========================================================================

const LIST_LOGS_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) to list logs from.',
  level: 'Filter logs by level. Options: "info", "error", "debug", "warning", "verbose"',
  page: 'Page number for pagination. Default: 1',
  per_page: 'Number of results per page (1-100). Default: 25',
} as const;

export const ListLogsSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(LIST_LOGS_PARAM_DESCRIPTIONS.session_id),
  level: z
    .enum(['info', 'error', 'debug', 'warning', 'verbose'])
    .optional()
    .describe(LIST_LOGS_PARAM_DESCRIPTIONS.level),
  page: z.number().min(1).optional().describe(LIST_LOGS_PARAM_DESCRIPTIONS.page),
  per_page: z.number().min(1).max(100).optional().describe(LIST_LOGS_PARAM_DESCRIPTIONS.per_page),
});

const LIST_LOGS_DESCRIPTION = `List logs for a specific session.

**Returns:** A paginated list of log entries with their content, level, and timestamps.

**Use cases:**
- Review session execution history
- Debug session issues by viewing error logs
- Monitor agent progress through info logs`;

function formatLog(log: Log): string {
  const levelEmoji: Record<string, string> = {
    info: 'i',
    error: 'E',
    debug: 'D',
    warning: 'W',
    verbose: 'V',
  };
  const emoji = levelEmoji[log.level] || '?';
  return `[${emoji}] ${log.created_at} - ${log.content}`;
}

export function listLogsTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'list_logs',
    description: LIST_LOGS_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: LIST_LOGS_PARAM_DESCRIPTIONS.session_id,
        },
        level: {
          type: 'string',
          enum: ['info', 'error', 'debug', 'warning', 'verbose'],
          description: LIST_LOGS_PARAM_DESCRIPTIONS.level,
        },
        page: {
          type: 'number',
          minimum: 1,
          description: LIST_LOGS_PARAM_DESCRIPTIONS.page,
        },
        per_page: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          description: LIST_LOGS_PARAM_DESCRIPTIONS.per_page,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListLogsSchema.parse(args);
        const client = clientFactory();

        const { session_id, ...options } = validatedArgs;
        const response = await client.listLogs(session_id, options);

        if (response.logs.length === 0) {
          const levelFilter = validatedArgs.level ? ` at level "${validatedArgs.level}"` : '';
          return {
            content: [
              {
                type: 'text',
                text: `No logs found for session ${session_id}${levelFilter}.`,
              },
            ],
          };
        }

        const lines = [
          `## Session Logs (Session ${session_id})`,
          '',
          `Showing ${response.logs.length} of ${response.pagination.total_count} log entries (page ${response.pagination.page} of ${response.pagination.total_pages}):`,
          '',
          '```',
        ];

        response.logs.forEach((log) => {
          lines.push(formatLog(log));
        });

        lines.push('```');

        if (response.pagination.page < response.pagination.total_pages) {
          lines.push('');
          lines.push(
            `*More logs available. Use page=${response.pagination.page + 1} to see the next page.*`
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
              text: `Error listing logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Create Log Tool
// ===========================================================================

const CREATE_LOG_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) to add the log to.',
  content: 'Log message content.',
  level: 'Log level. Options: "info", "error", "debug", "warning", "verbose"',
} as const;

export const CreateLogSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(CREATE_LOG_PARAM_DESCRIPTIONS.session_id),
  content: z.string().min(1).describe(CREATE_LOG_PARAM_DESCRIPTIONS.content),
  level: z
    .enum(['info', 'error', 'debug', 'warning', 'verbose'])
    .describe(CREATE_LOG_PARAM_DESCRIPTIONS.level),
});

const CREATE_LOG_DESCRIPTION = `Create a new log entry for a session.

**Returns:** The created log entry.

**Use cases:**
- Add external system notifications to session logs
- Record custom events during session execution
- Add debugging information`;

export function createLogTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'create_log',
    description: CREATE_LOG_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: CREATE_LOG_PARAM_DESCRIPTIONS.session_id,
        },
        content: {
          type: 'string',
          minLength: 1,
          description: CREATE_LOG_PARAM_DESCRIPTIONS.content,
        },
        level: {
          type: 'string',
          enum: ['info', 'error', 'debug', 'warning', 'verbose'],
          description: CREATE_LOG_PARAM_DESCRIPTIONS.level,
        },
      },
      required: ['session_id', 'content', 'level'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateLogSchema.parse(args);
        const client = clientFactory();

        const { session_id, ...logData } = validatedArgs;
        const log = await client.createLog(session_id, logData);

        const lines = [
          `## Log Created`,
          '',
          `- **ID:** ${log.id}`,
          `- **Session:** ${log.session_id}`,
          `- **Level:** ${log.level}`,
          `- **Created:** ${log.created_at}`,
          '',
          '**Content:**',
          '```',
          log.content,
          '```',
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating log: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
