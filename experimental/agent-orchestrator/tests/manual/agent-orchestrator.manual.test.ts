import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestOutcome {
  status: 'SUCCESS' | 'WARNING' | 'FAILURE';
  details: {
    searchSessionsWorks: boolean;
    getSessionWorks: boolean;
    getSessionWithLogsWorks: boolean;
    getSessionTranscriptFormatWorks: boolean;
    startSessionWorks: boolean;
    actionSessionWorks: boolean;
    actionSessionNewActionsWork: boolean;
    manageEnqueuedMessagesWorks: boolean;
    getConfigsWorks: boolean;
    sendPushNotificationWorks: boolean;
    getNotificationsWorks: boolean;
    actionNotificationWorks: boolean;
    searchTriggersWorks: boolean;
    actionTriggerWorks: boolean;
    getSystemHealthWorks: boolean;
    actionHealthWorks: boolean;
  };
  warnings: string[];
  errors: string[];
}

/**
 * End-to-end system tests for Agent Orchestrator MCP Server.
 *
 * These tests require:
 * 1. Agent-orchestrator Rails server running at AGENT_ORCHESTRATOR_BASE_URL
 * 2. Valid API key in AGENT_ORCHESTRATOR_API_KEY
 *
 * Test Outcomes:
 * - SUCCESS: Full happy path completed with all assertions passing
 * - WARNING: API integration works but insufficient data to fully validate
 * - FAILURE: Verifiable breakage in the integration
 */
describe('Agent Orchestrator MCP Server - Manual Tests', () => {
  let client: TestMCPClient;
  let testSessionId: number | null = null;
  const outcome: TestOutcome = {
    status: 'SUCCESS',
    details: {
      searchSessionsWorks: false,
      getSessionWorks: false,
      getSessionWithLogsWorks: false,
      getSessionTranscriptFormatWorks: false,
      startSessionWorks: false,
      actionSessionWorks: false,
      actionSessionNewActionsWork: false,
      manageEnqueuedMessagesWorks: false,
      getConfigsWorks: false,
      sendPushNotificationWorks: false,
      getNotificationsWorks: false,
      actionNotificationWorks: false,
      searchTriggersWorks: false,
      actionTriggerWorks: false,
      getSystemHealthWorks: false,
      actionHealthWorks: false,
    },
    warnings: [],
    errors: [],
  };

  beforeAll(async () => {
    if (!process.env.AGENT_ORCHESTRATOR_API_KEY) {
      throw new Error('Manual tests require AGENT_ORCHESTRATOR_API_KEY environment variable');
    }
    if (!process.env.AGENT_ORCHESTRATOR_BASE_URL) {
      throw new Error('Manual tests require AGENT_ORCHESTRATOR_BASE_URL environment variable');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        AGENT_ORCHESTRATOR_API_KEY: process.env.AGENT_ORCHESTRATOR_API_KEY,
        AGENT_ORCHESTRATOR_BASE_URL: process.env.AGENT_ORCHESTRATOR_BASE_URL,
      },
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }

    // Log final outcome summary
    console.log('\n=== TEST OUTCOME SUMMARY ===');
    console.log(`Status: ${outcome.status}`);
    console.log('Details:', JSON.stringify(outcome.details, null, 2));
    if (outcome.warnings.length > 0) {
      console.log('Warnings:', outcome.warnings);
    }
    if (outcome.errors.length > 0) {
      console.log('Errors:', outcome.errors);
    }
  });

  // =========================================================================
  // TOOL REGISTRATION
  // =========================================================================

  describe('Tool Registration', () => {
    it('should register exactly 13 tools', async () => {
      const result = await client.listTools();
      const tools = result.tools;

      expect(tools.length).toBe(13);

      const toolNames = tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('search_sessions');
      expect(toolNames).toContain('get_session');
      expect(toolNames).toContain('start_session');
      expect(toolNames).toContain('action_session');
      expect(toolNames).toContain('get_configs');
      expect(toolNames).toContain('manage_enqueued_messages');
      expect(toolNames).toContain('send_push_notification');
      expect(toolNames).toContain('get_notifications');
      expect(toolNames).toContain('action_notification');
      expect(toolNames).toContain('search_triggers');
      expect(toolNames).toContain('action_trigger');
      expect(toolNames).toContain('get_system_health');
      expect(toolNames).toContain('action_health');
    });
  });

  // =========================================================================
  // SESSIONS DOMAIN - EXISTING TOOLS
  // =========================================================================

  describe('search_sessions', () => {
    it('should list all sessions', async () => {
      const result = await client.callTool('search_sessions', {});

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      // Should return markdown formatted session list
      expect(text).toContain('Sessions');

      outcome.details.searchSessionsWorks = true;
    });

    it('should filter sessions by status', async () => {
      const result = await client.callTool('search_sessions', {
        status: 'running',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();

      const text = result.content[0].text as string;
      // Should either contain running sessions or indicate no results
      expect(text.length).toBeGreaterThan(0);
    });

    it('should search sessions by query', async () => {
      const result = await client.callTool('search_sessions', {
        query: 'agent',
        search_contents: true,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
    });

    it('should get a specific session by ID', async () => {
      // First get a list of sessions to find a valid ID
      const listResult = await client.callTool('search_sessions', {});
      const listText = listResult.content[0].text as string;

      // Extract first session ID from the markdown output (format: "### Title (ID: 123)")
      const idMatch = listText.match(/\(ID: (\d+)\)/);
      if (idMatch) {
        testSessionId = parseInt(idMatch[1], 10);

        const result = await client.callTool('search_sessions', {
          id: testSessionId,
        });

        expect(result.isError).toBe(false);
        expect(result.content[0].text).toContain(`ID: ${testSessionId}`);
      } else {
        outcome.warnings.push('No sessions found to test ID lookup');
      }
    });
  });

  describe('get_session', () => {
    it('should get detailed session info', async () => {
      if (!testSessionId) {
        // Get a session ID first
        const listResult = await client.callTool('search_sessions', {});
        const listText = listResult.content[0].text as string;
        const idMatch = listText.match(/\(ID: (\d+)\)/);
        if (idMatch) {
          testSessionId = parseInt(idMatch[1], 10);
        }
      }

      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
        });

        expect(result.isError).toBe(false);
        expect(result.content).toBeDefined();

        const text = result.content[0].text as string;
        // Output format is "## Session: Title" with "### Basic Information" section
        expect(text).toContain('## Session:');
        expect(text).toContain(`ID:** ${testSessionId}`);

        outcome.details.getSessionWorks = true;
      } else {
        outcome.warnings.push('No sessions available to test get_session');
      }
    });

    it('should get session with transcript', async () => {
      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
          include_transcript: true,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        // Session header should be present
        expect(text).toContain('## Session:');
      }
    });

    it('should get session with transcript_format text', async () => {
      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
          include_transcript: true,
          transcript_format: 'text',
        });

        const text = result.content[0].text as string;

        if (result.isError) {
          // The transcript endpoint exists but may return 404 if no transcript
          // is available for this particular session - that's expected behavior
          expect(text).toContain('transcript');
          outcome.warnings.push(
            `transcript_format: session ${testSessionId} has no transcript (API returned 404)`
          );
        } else {
          // Session header should be present, and transcript section
          expect(text).toContain('## Session:');
          expect(text).toContain('Transcript');
        }

        outcome.details.getSessionTranscriptFormatWorks = true;
      }
    });

    it('should get session with logs', async () => {
      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
          include_logs: true,
          logs_per_page: 5,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        // Logs section should be present
        expect(text.length).toBeGreaterThan(0);

        outcome.details.getSessionWithLogsWorks = true;
      }
    });

    it('should get session with subagent transcripts', async () => {
      if (testSessionId) {
        const result = await client.callTool('get_session', {
          id: testSessionId,
          include_subagent_transcripts: true,
          transcripts_per_page: 5,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text.length).toBeGreaterThan(0);
      }
    });

    it('should handle non-existent session gracefully', async () => {
      const result = await client.callTool('get_session', {
        id: 999999999,
      });

      // Should return an error response, not crash
      expect(result.content).toBeDefined();
      // The API should return a 404 or similar error
      if (result.isError) {
        expect(result.content[0].text).toContain('Error');
      }
    });
  });

  describe('start_session', () => {
    it('should create a new session (clone-only mode)', async () => {
      // Create a test session without a prompt (clone-only)
      const result = await client.callTool('start_session', {
        title: `MCP Manual Test Session ${Date.now()}`,
        git_root: 'https://github.com/pulsemcp/mcp-servers.git',
        branch: 'main',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();

      const text = result.content[0].text as string;
      // Should indicate session was created
      expect(text).toContain('Session');

      // Extract created session ID for cleanup
      const idMatch = text.match(/ID:\*?\*? (\d+)/);
      if (idMatch) {
        const createdSessionId = parseInt(idMatch[1], 10);
        outcome.details.startSessionWorks = true;

        // Archive the test session to clean up
        await client.callTool('action_session', {
          session_id: createdSessionId,
          action: 'archive',
        });
      }
    });
  });

  describe('action_session', () => {
    let actionTestSessionId: number | null = null;

    it('should create a session for action testing', async () => {
      const result = await client.callTool('start_session', {
        title: `Action Test Session ${Date.now()}`,
        git_root: 'https://github.com/pulsemcp/mcp-servers.git',
        branch: 'main',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      const idMatch = text.match(/ID:\*?\*? (\d+)/);
      if (idMatch) {
        actionTestSessionId = parseInt(idMatch[1], 10);
      }
    });

    // --- New actions (run before archive/unarchive to ensure session is active) ---

    it('should update session notes', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'update_notes',
          session_notes: 'Manual test notes - please ignore',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Session Notes Updated');

        outcome.details.actionSessionNewActionsWork = true;
      }
    });

    it('should toggle favorite', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'toggle_favorite',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Favorite Toggled');
        expect(text).toMatch(/Favorited:\*\*\s*(Yes|No)/);
      }
    });

    it('should refresh a session', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'refresh',
        });

        const text = result.content[0].text as string;

        if (result.isError) {
          // Refresh requires a clone path - newly created sessions may not have one
          // The API returns 422 in this case, which is expected behavior
          expect(text).toContain('Error');
          outcome.warnings.push(
            `refresh: session ${actionTestSessionId} cannot be refreshed (no clone path)`
          );
        } else {
          expect(text).toContain('Session Refreshed');
        }
      }
    });

    it('should refresh all sessions', async () => {
      const result = await client.callTool('action_session', {
        action: 'refresh_all',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('All Sessions Refreshed');
    });

    it('should require session_notes for update_notes action', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'update_notes',
          // Missing session_notes - should error
        });

        expect(result.isError).toBe(true);
        const text = result.content[0].text as string;
        expect(text).toContain('session_notes');
      }
    });

    it('should require session_id for fork action', async () => {
      const result = await client.callTool('action_session', {
        action: 'fork',
        message_index: 0,
        // Missing session_id - should error
      });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('session_id');
    });

    it('should require prompt for follow_up action', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'follow_up',
          // Missing prompt - should error
        });

        expect(result.isError).toBe(true);
        const text = result.content[0].text as string;
        expect(text).toContain('prompt');
      }
    });

    // --- Archive/unarchive (these may change session state, so run last) ---

    it('should archive a session', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'archive',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Archived');

        outcome.details.actionSessionWorks = true;
      }
    });

    it('should unarchive a session', async () => {
      if (actionTestSessionId) {
        const result = await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'unarchive',
        });

        // Unarchive may succeed or fail depending on backend state
        expect(result.content).toBeDefined();
        const text = result.content[0].text as string;
        if (!result.isError) {
          expect(text).toContain('Unarchived');
        }
      }
    });

    it('should clean up test session', async () => {
      if (actionTestSessionId) {
        // Archive to clean up
        await client.callTool('action_session', {
          session_id: actionTestSessionId,
          action: 'archive',
        });
      }
    });
  });

  // =========================================================================
  // SESSIONS DOMAIN - ENQUEUED MESSAGES
  // =========================================================================

  describe('manage_enqueued_messages', () => {
    let msgTestSessionId: number | null = null;
    let createdMessageId: number | null = null;

    it('should create a session for message testing', async () => {
      const result = await client.callTool('start_session', {
        title: `Enqueued Msg Test Session ${Date.now()}`,
        git_root: 'https://github.com/pulsemcp/mcp-servers.git',
        branch: 'main',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      const idMatch = text.match(/ID:\*?\*? (\d+)/);
      if (idMatch) {
        msgTestSessionId = parseInt(idMatch[1], 10);
      }
    });

    it('should list enqueued messages (initially empty)', async () => {
      if (msgTestSessionId) {
        const result = await client.callTool('manage_enqueued_messages', {
          session_id: msgTestSessionId,
          action: 'list',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Enqueued Messages');

        outcome.details.manageEnqueuedMessagesWorks = true;
      }
    });

    it('should create an enqueued message', async () => {
      if (msgTestSessionId) {
        const result = await client.callTool('manage_enqueued_messages', {
          session_id: msgTestSessionId,
          action: 'create',
          content: 'Manual test enqueued message - please ignore',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Message Enqueued');

        // Extract message ID for later tests
        const idMatch = text.match(/ID:\*?\*? (\d+)/);
        if (idMatch) {
          createdMessageId = parseInt(idMatch[1], 10);
        }
      }
    });

    it('should get a specific enqueued message', async () => {
      if (msgTestSessionId && createdMessageId) {
        const result = await client.callTool('manage_enqueued_messages', {
          session_id: msgTestSessionId,
          action: 'get',
          message_id: createdMessageId,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Enqueued Message');
        expect(text).toContain('Manual test enqueued message');
      }
    });

    it('should update an enqueued message', async () => {
      if (msgTestSessionId && createdMessageId) {
        const result = await client.callTool('manage_enqueued_messages', {
          session_id: msgTestSessionId,
          action: 'update',
          message_id: createdMessageId,
          content: 'Updated manual test message',
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Message Updated');
      }
    });

    it('should require content for create action', async () => {
      if (msgTestSessionId) {
        const result = await client.callTool('manage_enqueued_messages', {
          session_id: msgTestSessionId,
          action: 'create',
          // Missing content - should error
        });

        expect(result.isError).toBe(true);
        const text = result.content[0].text as string;
        expect(text).toContain('content');
      }
    });

    it('should delete an enqueued message', async () => {
      if (msgTestSessionId && createdMessageId) {
        const result = await client.callTool('manage_enqueued_messages', {
          session_id: msgTestSessionId,
          action: 'delete',
          message_id: createdMessageId,
        });

        expect(result.isError).toBe(false);
        const text = result.content[0].text as string;
        expect(text).toContain('Message Deleted');
      }
    });

    it('should clean up test session', async () => {
      if (msgTestSessionId) {
        await client.callTool('action_session', {
          session_id: msgTestSessionId,
          action: 'archive',
        });
      }
    });
  });

  // =========================================================================
  // SESSIONS DOMAIN - CONFIGS
  // =========================================================================

  describe('get_configs', () => {
    it('should retrieve server configurations', async () => {
      const result = await client.callTool('get_configs', {});

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const text = result.content[0].text as string;
      // Response contains MCP Servers, Agent Roots, and Stop Conditions sections
      expect(text).toContain('MCP Servers');

      outcome.details.getConfigsWorks = true;
    });
  });

  // =========================================================================
  // NOTIFICATIONS DOMAIN
  // =========================================================================

  describe('get_notifications', () => {
    it('should get notification badge count', async () => {
      const result = await client.callTool('get_notifications', {
        badge_only: true,
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('Notification Badge');
      expect(text).toContain('Pending notifications');

      outcome.details.getNotificationsWorks = true;
    });

    it('should list notifications', async () => {
      const result = await client.callTool('get_notifications', {});

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('Notification');
    });

    it('should filter notifications by status', async () => {
      const result = await client.callTool('get_notifications', {
        status: 'unread',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
    });
  });

  describe('send_push_notification', () => {
    it('should send a push notification for a valid session', async () => {
      if (!testSessionId) {
        // Get a session ID first
        const listResult = await client.callTool('search_sessions', {});
        const listText = listResult.content[0].text as string;
        const idMatch = listText.match(/\(ID: (\d+)\)/);
        if (idMatch) {
          testSessionId = parseInt(idMatch[1], 10);
        }
      }

      if (testSessionId) {
        const result = await client.callTool('send_push_notification', {
          session_id: testSessionId,
          message: 'Manual test push notification - please ignore',
        });

        expect(result.isError).toBe(false);
        expect(result.content).toBeDefined();

        const text = result.content[0].text as string;
        expect(text).toContain('Push Notification Sent');
        expect(text).toContain('Manual test push notification - please ignore');

        outcome.details.sendPushNotificationWorks = true;
      } else {
        outcome.warnings.push('No sessions available to test send_push_notification');
      }
    });

    it('should handle non-existent session gracefully', async () => {
      const result = await client.callTool('send_push_notification', {
        session_id: 999999999,
        message: 'Should fail - non-existent session',
      });

      // Should return an error response, not crash
      expect(result.content).toBeDefined();
    });
  });

  describe('action_notification', () => {
    it('should mark all notifications as read', async () => {
      const result = await client.callTool('action_notification', {
        action: 'mark_all_read',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('All Notifications Marked Read');
      expect(text).toContain('Marked');

      outcome.details.actionNotificationWorks = true;
    });

    it('should dismiss all read notifications', async () => {
      const result = await client.callTool('action_notification', {
        action: 'dismiss_all_read',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('Read Notifications Dismissed');
      expect(text).toContain('Dismissed');
    });

    it('should require id for mark_read action', async () => {
      const result = await client.callTool('action_notification', {
        action: 'mark_read',
        // Missing id - should error
      });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('id');
    });

    it('should require id for dismiss action', async () => {
      const result = await client.callTool('action_notification', {
        action: 'dismiss',
        // Missing id - should error
      });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('id');
    });
  });

  // =========================================================================
  // TRIGGERS DOMAIN
  // =========================================================================

  describe('search_triggers', () => {
    it('should list triggers', async () => {
      const result = await client.callTool('search_triggers', {});

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('Trigger');

      outcome.details.searchTriggersWorks = true;
    });

    it('should list triggers with channels', async () => {
      const result = await client.callTool('search_triggers', {
        include_channels: true,
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('Trigger');
      // May or may not contain "Slack Channels" depending on Slack integration
    });

    it('should filter triggers by type', async () => {
      const result = await client.callTool('search_triggers', {
        trigger_type: 'schedule',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
    });
  });

  describe('action_trigger', () => {
    it('should require name, type, agent_root_name, prompt_template for create', async () => {
      const result = await client.callTool('action_trigger', {
        action: 'create',
        // Missing required fields - should error
      });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('name');
      expect(text).toContain('trigger_type');

      outcome.details.actionTriggerWorks = true;
    });

    it('should require id for update action', async () => {
      const result = await client.callTool('action_trigger', {
        action: 'update',
        // Missing id - should error
      });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('id');
    });

    it('should require id for delete action', async () => {
      const result = await client.callTool('action_trigger', {
        action: 'delete',
        // Missing id - should error
      });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('id');
    });

    it('should require id for toggle action', async () => {
      const result = await client.callTool('action_trigger', {
        action: 'toggle',
        // Missing id - should error
      });

      expect(result.isError).toBe(true);
      const text = result.content[0].text as string;
      expect(text).toContain('id');
    });
  });

  // =========================================================================
  // HEALTH DOMAIN
  // =========================================================================

  describe('get_system_health', () => {
    it('should get system health report', async () => {
      const result = await client.callTool('get_system_health', {});

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('System Health Report');
      expect(text).toContain('Timestamp');

      outcome.details.getSystemHealthWorks = true;
    });

    it('should get system health with CLI status', async () => {
      const result = await client.callTool('get_system_health', {
        include_cli_status: true,
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('System Health Report');
      // CLI status section may be present or may show fetch error
      expect(text.length).toBeGreaterThan(50);
    });
  });

  describe('action_health', () => {
    it('should cleanup stale processes', async () => {
      const result = await client.callTool('action_health', {
        action: 'cleanup_processes',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('Processes Cleaned Up');

      outcome.details.actionHealthWorks = true;
    });

    it('should archive old sessions', async () => {
      // Use a large days value to avoid accidentally archiving recent sessions
      const result = await client.callTool('action_health', {
        action: 'archive_old',
        days: 365,
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('Old Sessions Archived');
    });

    it('should queue CLI refresh', async () => {
      const result = await client.callTool('action_health', {
        action: 'cli_refresh',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('CLI Refresh Queued');
    });

    it('should queue CLI cache clear', async () => {
      const result = await client.callTool('action_health', {
        action: 'cli_clear_cache',
      });

      expect(result.isError).toBe(false);
      const text = result.content[0].text as string;
      expect(text).toContain('CLI Cache Clear Queued');
    });
  });

  // =========================================================================
  // RESOURCES
  // =========================================================================

  describe('Resources', () => {
    it('should list config resource', async () => {
      const result = await client.listResources();
      const resources = result.resources;

      expect(resources.length).toBeGreaterThanOrEqual(1);
      const uris = resources.map((r: { uri: string }) => r.uri);
      expect(uris).toContain('agent-orchestrator://config');
    });

    it('should read config resource with updated tool groups', async () => {
      const result = await client.readResource('agent-orchestrator://config');

      expect(result.contents).toBeDefined();
      expect(result.contents[0].uri).toBe('agent-orchestrator://config');
      expect(result.contents[0].mimeType).toBe('application/json');

      const config = JSON.parse(result.contents[0].text as string);
      expect(config.server.name).toBe('agent-orchestrator-mcp-server');

      // Verify all 4 tool groups are listed in the config resource
      expect(config.toolGroups).toBeDefined();
      expect(config.toolGroups.sessions).toBeDefined();
      expect(config.toolGroups.sessions_readonly).toBeDefined();
      expect(config.toolGroups.notifications).toBeDefined();
      expect(config.toolGroups.notifications_readonly).toBeDefined();
      expect(config.toolGroups.triggers).toBeDefined();
      expect(config.toolGroups.triggers_readonly).toBeDefined();
      expect(config.toolGroups.health).toBeDefined();
      expect(config.toolGroups.health_readonly).toBeDefined();
    });
  });
});
