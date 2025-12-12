import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

// ===========================================================================
// Follow Up Tool
// ===========================================================================

const FOLLOW_UP_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) of the session to send a follow-up to.',
  prompt: 'The follow-up prompt to send to the agent.',
} as const;

export const FollowUpSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(FOLLOW_UP_PARAM_DESCRIPTIONS.session_id),
  prompt: z.string().min(1).describe(FOLLOW_UP_PARAM_DESCRIPTIONS.prompt),
});

const FOLLOW_UP_DESCRIPTION = `Send a follow-up prompt to a paused session.

**Requirement:** The session must be in "needs_input" status.

**Returns:** Updated session information with confirmation message.

**Use cases:**
- Provide additional instructions to an agent waiting for input
- Continue a conversation with the agent
- Give feedback on the agent's work`;

export function followUpTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'follow_up',
    description: FOLLOW_UP_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: FOLLOW_UP_PARAM_DESCRIPTIONS.session_id,
        },
        prompt: {
          type: 'string',
          minLength: 1,
          description: FOLLOW_UP_PARAM_DESCRIPTIONS.prompt,
        },
      },
      required: ['session_id', 'prompt'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = FollowUpSchema.parse(args);
        const client = clientFactory();

        const response = await client.followUp(validatedArgs.session_id, validatedArgs.prompt);

        const lines = [
          `## Follow-up Sent`,
          '',
          `- **Session ID:** ${response.session.id}`,
          `- **New Status:** ${response.session.status}`,
        ];

        if (response.message) {
          lines.push(`- **Message:** ${response.message}`);
        }

        if (response.session.running_job_id) {
          lines.push(`- **Job ID:** ${response.session.running_job_id}`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending follow-up: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Pause Session Tool
// ===========================================================================

const PAUSE_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) of the session to pause.',
} as const;

export const PauseSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(PAUSE_PARAM_DESCRIPTIONS.session_id),
});

const PAUSE_DESCRIPTION = `Pause a running session, transitioning it to "needs_input" status.

**Returns:** Updated session information with confirmation.

**Use cases:**
- Pause an agent to review its progress
- Stop an agent before sending new instructions
- Interrupt a long-running task`;

export function pauseSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'pause_session',
    description: PAUSE_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: PAUSE_PARAM_DESCRIPTIONS.session_id,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = PauseSessionSchema.parse(args);
        const client = clientFactory();

        const response = await client.pauseSession(validatedArgs.session_id);

        const lines = [
          `## Session Paused`,
          '',
          `- **Session ID:** ${response.session.id}`,
          `- **Title:** ${response.session.title}`,
          `- **New Status:** ${response.session.status}`,
        ];

        if (response.message) {
          lines.push(`- **Message:** ${response.message}`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error pausing session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Restart Session Tool
// ===========================================================================

const RESTART_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) of the session to restart.',
} as const;

export const RestartSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(RESTART_PARAM_DESCRIPTIONS.session_id),
});

const RESTART_DESCRIPTION = `Restart a paused or failed session.

**Requirement:** The session must be in "needs_input" or "failed" status.

**Returns:** Updated session information with confirmation.

**Use cases:**
- Resume a paused session without providing new input
- Retry a failed session
- Continue agent work from where it left off`;

export function restartSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'restart_session',
    description: RESTART_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: RESTART_PARAM_DESCRIPTIONS.session_id,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = RestartSessionSchema.parse(args);
        const client = clientFactory();

        const response = await client.restartSession(validatedArgs.session_id);

        const lines = [
          `## Session Restarted`,
          '',
          `- **Session ID:** ${response.session.id}`,
          `- **Title:** ${response.session.title}`,
          `- **New Status:** ${response.session.status}`,
        ];

        if (response.message) {
          lines.push(`- **Message:** ${response.message}`);
        }

        if (response.session.running_job_id) {
          lines.push(`- **Job ID:** ${response.session.running_job_id}`);
        }

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error restarting session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Archive Session Tool
// ===========================================================================

const ARCHIVE_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) of the session to archive.',
} as const;

export const ArchiveSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(ARCHIVE_PARAM_DESCRIPTIONS.session_id),
});

const ARCHIVE_DESCRIPTION = `Archive a session.

**Allowed statuses:** waiting, running, needs_input, failed

**Returns:** Updated session information with confirmation.

**Use cases:**
- Mark a completed session as archived
- Clean up sessions that are no longer needed
- Organize sessions by archiving old ones`;

export function archiveSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'archive_session',
    description: ARCHIVE_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: ARCHIVE_PARAM_DESCRIPTIONS.session_id,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ArchiveSessionSchema.parse(args);
        const client = clientFactory();

        const session = await client.archiveSession(validatedArgs.session_id);

        const lines = [
          `## Session Archived`,
          '',
          `- **Session ID:** ${session.id}`,
          `- **Title:** ${session.title}`,
          `- **New Status:** ${session.status}`,
          `- **Archived At:** ${session.archived_at}`,
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error archiving session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Unarchive Session Tool
// ===========================================================================

const UNARCHIVE_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) of the session to unarchive.',
} as const;

export const UnarchiveSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(UNARCHIVE_PARAM_DESCRIPTIONS.session_id),
});

const UNARCHIVE_DESCRIPTION = `Restore an archived session to "needs_input" status.

**Requirement:** The session must be in "archived" status.

**Returns:** Updated session information with confirmation.

**Use cases:**
- Restore a session that was archived by mistake
- Continue work on a previously completed session
- Re-open a session for further investigation`;

export function unarchiveSessionTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'unarchive_session',
    description: UNARCHIVE_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: UNARCHIVE_PARAM_DESCRIPTIONS.session_id,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UnarchiveSessionSchema.parse(args);
        const client = clientFactory();

        const session = await client.unarchiveSession(validatedArgs.session_id);

        const lines = [
          `## Session Unarchived`,
          '',
          `- **Session ID:** ${session.id}`,
          `- **Title:** ${session.title}`,
          `- **New Status:** ${session.status}`,
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error unarchiving session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Update Session Tool
// ===========================================================================

const UPDATE_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) of the session to update.',
  title: 'New title for the session.',
  slug: 'New URL-friendly identifier for the session.',
  stop_condition: 'New stop condition for the agent.',
  custom_metadata: 'User-defined metadata to update or add.',
} as const;

export const UpdateSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(UPDATE_PARAM_DESCRIPTIONS.session_id),
  title: z.string().optional().describe(UPDATE_PARAM_DESCRIPTIONS.title),
  slug: z.string().optional().describe(UPDATE_PARAM_DESCRIPTIONS.slug),
  stop_condition: z.string().optional().describe(UPDATE_PARAM_DESCRIPTIONS.stop_condition),
  custom_metadata: z
    .record(z.unknown())
    .optional()
    .describe(UPDATE_PARAM_DESCRIPTIONS.custom_metadata),
});

const UPDATE_DESCRIPTION = `Update session attributes.

**Updatable fields:** title, slug, stop_condition, custom_metadata

**Returns:** Updated session information.

**Use cases:**
- Rename a session for better organization
- Update custom metadata for tracking
- Change the stop condition during execution`;

export function updateSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'update_session',
    description: UPDATE_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: UPDATE_PARAM_DESCRIPTIONS.session_id,
        },
        title: {
          type: 'string',
          description: UPDATE_PARAM_DESCRIPTIONS.title,
        },
        slug: {
          type: 'string',
          description: UPDATE_PARAM_DESCRIPTIONS.slug,
        },
        stop_condition: {
          type: 'string',
          description: UPDATE_PARAM_DESCRIPTIONS.stop_condition,
        },
        custom_metadata: {
          type: 'object',
          description: UPDATE_PARAM_DESCRIPTIONS.custom_metadata,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UpdateSessionSchema.parse(args);
        const client = clientFactory();

        const { session_id, ...updateData } = validatedArgs;
        const session = await client.updateSession(session_id, updateData);

        const lines = [
          `## Session Updated`,
          '',
          `- **Session ID:** ${session.id}`,
          `- **Title:** ${session.title}`,
          `- **Status:** ${session.status}`,
        ];

        if (session.slug) lines.push(`- **Slug:** ${session.slug}`);
        if (session.stop_condition) lines.push(`- **Stop Condition:** ${session.stop_condition}`);
        lines.push(`- **Updated:** ${session.updated_at}`);

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error updating session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

// ===========================================================================
// Delete Session Tool
// ===========================================================================

const DELETE_PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) or slug (string) of the session to delete.',
} as const;

export const DeleteSessionSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(DELETE_PARAM_DESCRIPTIONS.session_id),
});

const DELETE_DESCRIPTION = `Permanently delete a session and all associated logs and transcripts.

**Warning:** This action is irreversible.

**Returns:** Confirmation of deletion.

**Use cases:**
- Remove test sessions
- Clean up failed sessions
- Delete sensitive session data`;

export function deleteSessionTool(_server: Server, clientFactory: () => IAgentOrchestratorClient) {
  return {
    name: 'delete_session',
    description: DELETE_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: DELETE_PARAM_DESCRIPTIONS.session_id,
        },
      },
      required: ['session_id'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteSessionSchema.parse(args);
        const client = clientFactory();

        await client.deleteSession(validatedArgs.session_id);

        return {
          content: [
            {
              type: 'text',
              text: `## Session Deleted\n\nSession ${validatedArgs.session_id} has been permanently deleted.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
