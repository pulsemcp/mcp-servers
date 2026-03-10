import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockOrchestratorClient } from '../mocks/orchestrator-client.functional-mock.js';
import { quickSearchSessionsTool } from '../../shared/src/tools/search-sessions.js';
import { startSessionTool } from '../../shared/src/tools/start-session.js';
import { getSessionTool } from '../../shared/src/tools/get-session.js';
import { actionSessionTool } from '../../shared/src/tools/action-session.js';
import { getConfigsTool } from '../../shared/src/tools/get-configs.js';
import { sendPushNotificationTool } from '../../shared/src/tools/send-push-notification.js';
import { manageEnqueuedMessagesTool } from '../../shared/src/tools/manage-enqueued-messages.js';
import { getNotificationsTool } from '../../shared/src/tools/get-notifications.js';
import { actionNotificationTool } from '../../shared/src/tools/action-notification.js';
import { searchTriggersTool } from '../../shared/src/tools/search-triggers.js';
import { actionTriggerTool } from '../../shared/src/tools/action-trigger.js';
import { getSystemHealthTool } from '../../shared/src/tools/get-system-health.js';
import { actionHealthTool } from '../../shared/src/tools/action-health.js';
import { getTranscriptArchiveTool } from '../../shared/src/tools/get-transcript-archive.js';
import { clearConfigsCache } from '../../shared/src/cache/configs-cache.js';
import { parseEnabledToolGroups, createRegisterTools } from '../../shared/src/tools.js';
import {
  parseAllowedAgentRoots,
  filterAgentRoots,
  validateAgentRootConstraints,
} from '../../shared/src/allowed-agent-roots.js';
import type { AgentRootInfo } from '../../shared/src/types.js';

describe('Tools', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOrchestratorClient>;
  let clientFactory: () => ReturnType<typeof createMockOrchestratorClient>;

  beforeEach(() => {
    // Create minimal mock server for testing
    mockServer = {} as Server;
    mockClient = createMockOrchestratorClient();
    clientFactory = () => mockClient;
  });

  describe('quick_search_sessions', () => {
    it('should list all sessions when no filters provided', async () => {
      const tool = quickSearchSessionsTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Test Session'
      );
      expect(mockClient.listSessions).toHaveBeenCalledTimes(1);
    });

    it('should search sessions by query', async () => {
      const tool = quickSearchSessionsTool(mockServer, clientFactory);

      await tool.handler({ query: 'test' });

      expect(mockClient.searchSessions).toHaveBeenCalledWith('test', expect.anything());
    });

    it('should get session by ID', async () => {
      const tool = quickSearchSessionsTool(mockServer, clientFactory);

      const result = await tool.handler({ id: 1 });

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Found'
      );
      expect(mockClient.getSession).toHaveBeenCalledWith(1);
    });

    it('should filter by status', async () => {
      const tool = quickSearchSessionsTool(mockServer, clientFactory);

      await tool.handler({ status: 'running' });

      expect(mockClient.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running' })
      );
    });
  });

  describe('start_session', () => {
    it('should start a session', async () => {
      const tool = startSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        title: 'New Session',
        prompt: 'Do something',
        git_root: 'https://github.com/test/repo.git',
      });

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Started Successfully'
      );
      expect(mockClient.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Session',
          prompt: 'Do something',
          git_root: 'https://github.com/test/repo.git',
        })
      );
    });
  });

  describe('get_session', () => {
    it('should get session by ID', async () => {
      const tool = getSessionTool(mockServer, clientFactory);

      const result = await tool.handler({ id: 1 });

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Test Session'
      );
      expect(mockClient.getSession).toHaveBeenCalledWith(1, undefined);
    });

    it('should include transcript when requested', async () => {
      const tool = getSessionTool(mockServer, clientFactory);

      await tool.handler({ id: 1, include_transcript: true });

      expect(mockClient.getSession).toHaveBeenCalledWith(1, true);
    });

    it('should use transcript endpoint when transcript_format specified', async () => {
      const tool = getSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        id: 1,
        include_transcript: true,
        transcript_format: 'text',
      });

      // When transcript_format is specified, session is fetched without transcript
      expect(mockClient.getSession).toHaveBeenCalledWith(1, false);
      // And transcript endpoint is called separately
      expect(mockClient.getTranscript).toHaveBeenCalledWith(1, 'text');
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Transcript'
      );
    });

    it('should include logs when requested', async () => {
      const tool = getSessionTool(mockServer, clientFactory);

      const result = await tool.handler({ id: 1, include_logs: true });

      expect(mockClient.listLogs).toHaveBeenCalledWith(1, {
        page: undefined,
        per_page: undefined,
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain('Logs');
    });

    it('should include subagent transcripts when requested', async () => {
      const tool = getSessionTool(mockServer, clientFactory);

      const result = await tool.handler({ id: 1, include_subagent_transcripts: true });

      expect(mockClient.listSubagentTranscripts).toHaveBeenCalledWith(1, {
        page: undefined,
        per_page: undefined,
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Subagent Transcripts'
      );
    });
  });

  describe('action_session', () => {
    it('should send follow-up prompt', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'follow_up',
        prompt: 'Continue with next step',
      });

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Follow-up Sent'
      );
      expect(mockClient.followUp).toHaveBeenCalledWith(1, 'Continue with next step');
    });

    it('should require prompt for follow_up action', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'follow_up',
        // Missing prompt
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain('prompt');
    });

    it('should pause a session', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'pause',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Paused'
      );
      expect(mockClient.pauseSession).toHaveBeenCalledWith(1);
    });

    it('should restart a session', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'restart',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Restarted'
      );
      expect(mockClient.restartSession).toHaveBeenCalledWith(1);
    });

    it('should archive a session', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'archive',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Archived'
      );
      expect(mockClient.archiveSession).toHaveBeenCalledWith(1);
    });

    it('should unarchive a session', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'unarchive',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Unarchived'
      );
      expect(mockClient.unarchiveSession).toHaveBeenCalledWith(1);
    });

    it('should change MCP servers for a session', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'change_mcp_servers',
        mcp_servers: ['server1', 'server2'],
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'MCP Servers Updated'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'server1, server2'
      );
      expect(mockClient.changeMcpServers).toHaveBeenCalledWith(1, ['server1', 'server2']);
    });

    it('should require mcp_servers for change_mcp_servers action', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'change_mcp_servers',
        // Missing mcp_servers
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'mcp_servers'
      );
    });

    it('should handle empty mcp_servers array', async () => {
      mockClient.changeMcpServers = vi.fn().mockResolvedValue({
        id: 1,
        title: 'Test Session',
        mcp_servers: [],
      });

      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'change_mcp_servers',
        mcp_servers: [],
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'MCP Servers Updated'
      );
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain('(none)');
      expect(mockClient.changeMcpServers).toHaveBeenCalledWith(1, []);
    });

    // New action_session actions
    it('should fork a session', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'fork',
        message_index: 5,
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Forked'
      );
      expect(mockClient.forkSession).toHaveBeenCalledWith(1, 5);
    });

    it('should require message_index for fork action', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'fork',
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'message_index'
      );
    });

    it('should refresh a session', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'refresh',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Refreshed'
      );
      expect(mockClient.refreshSession).toHaveBeenCalledWith(1);
    });

    it('should refresh all sessions', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        action: 'refresh_all',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'All Sessions Refreshed'
      );
      expect(mockClient.refreshAllSessions).toHaveBeenCalled();
    });

    it('should update session notes', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'update_notes',
        session_notes: 'Some notes',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Notes Updated'
      );
      expect(mockClient.updateSessionNotes).toHaveBeenCalledWith(1, 'Some notes');
    });

    it('should toggle favorite', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'toggle_favorite',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Favorite Toggled'
      );
      expect(mockClient.toggleFavorite).toHaveBeenCalledWith(1);
    });

    it('should bulk archive sessions', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        action: 'bulk_archive',
        session_ids: [1, 2, 3],
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Bulk Archive Complete'
      );
      expect(mockClient.bulkArchiveSessions).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should require session_ids for bulk_archive', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        action: 'bulk_archive',
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'session_ids'
      );
    });

    it('should require session_id for actions that need it', async () => {
      const tool = actionSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        action: 'pause',
        // Missing session_id
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'session_id'
      );
    });
  });

  describe('manage_enqueued_messages', () => {
    it('should list enqueued messages', async () => {
      const tool = manageEnqueuedMessagesTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'list',
      });

      expect(mockClient.listEnqueuedMessages).toHaveBeenCalledWith(1, expect.anything());
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Enqueued Messages'
      );
    });

    it('should create an enqueued message', async () => {
      const tool = manageEnqueuedMessagesTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'create',
        content: 'New message',
      });

      expect(mockClient.createEnqueuedMessage).toHaveBeenCalledWith(1, expect.anything());
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Message Enqueued'
      );
    });

    it('should require content for create action', async () => {
      const tool = manageEnqueuedMessagesTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'create',
      });

      expect(result.isError).toBe(true);
    });

    it('should delete an enqueued message', async () => {
      const tool = manageEnqueuedMessagesTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        action: 'delete',
        message_id: 1,
      });

      expect(mockClient.deleteEnqueuedMessage).toHaveBeenCalledWith(1, 1);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Message Deleted'
      );
    });
  });

  describe('get_notifications', () => {
    it('should get notification badge', async () => {
      const tool = getNotificationsTool(mockServer, clientFactory);

      const result = await tool.handler({ badge_only: true });

      expect(mockClient.getNotificationBadge).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Notification Badge'
      );
    });

    it('should get notification by ID', async () => {
      const tool = getNotificationsTool(mockServer, clientFactory);

      const result = await tool.handler({ id: 1 });

      expect(mockClient.getNotification).toHaveBeenCalledWith(1);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Notification #1'
      );
    });

    it('should list notifications', async () => {
      const tool = getNotificationsTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(mockClient.listNotifications).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Notifications'
      );
    });
  });

  describe('action_notification', () => {
    it('should mark notification as read', async () => {
      const tool = actionNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'mark_read', id: 1 });

      expect(mockClient.markNotificationRead).toHaveBeenCalledWith(1);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Notification Marked Read'
      );
    });

    it('should mark all notifications as read', async () => {
      const tool = actionNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'mark_all_read' });

      expect(mockClient.markAllNotificationsRead).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'All Notifications Marked Read'
      );
    });

    it('should dismiss all read notifications', async () => {
      const tool = actionNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'dismiss_all_read' });

      expect(mockClient.dismissAllReadNotifications).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Read Notifications Dismissed'
      );
    });

    it('should require id for mark_read', async () => {
      const tool = actionNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'mark_read' });

      expect(result.isError).toBe(true);
    });
  });

  describe('search_triggers', () => {
    it('should list triggers', async () => {
      const tool = searchTriggersTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(mockClient.listTriggers).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Triggers'
      );
    });

    it('should get trigger by ID', async () => {
      const tool = searchTriggersTool(mockServer, clientFactory);

      const result = await tool.handler({ id: 1 });

      expect(mockClient.getTrigger).toHaveBeenCalledWith(1);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain('Trigger');
    });

    it('should include channels when requested', async () => {
      const tool = searchTriggersTool(mockServer, clientFactory);

      const result = await tool.handler({ include_channels: true });

      expect(mockClient.getTriggerChannels).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Slack Channels'
      );
    });
  });

  describe('action_trigger', () => {
    it('should create a trigger', async () => {
      const tool = actionTriggerTool(mockServer, clientFactory);

      const result = await tool.handler({
        action: 'create',
        name: 'New Trigger',
        trigger_type: 'schedule',
        agent_root_name: 'mcp-servers',
        prompt_template: 'Do something',
      });

      expect(mockClient.createTrigger).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Trigger Created'
      );
    });

    it('should toggle a trigger', async () => {
      const tool = actionTriggerTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'toggle', id: 1 });

      expect(mockClient.toggleTrigger).toHaveBeenCalledWith(1);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Trigger Toggled'
      );
    });

    it('should delete a trigger', async () => {
      const tool = actionTriggerTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'delete', id: 1 });

      expect(mockClient.deleteTrigger).toHaveBeenCalledWith(1);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Trigger Deleted'
      );
    });

    it('should require id for toggle', async () => {
      const tool = actionTriggerTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'toggle' });

      expect(result.isError).toBe(true);
    });
  });

  describe('get_system_health', () => {
    it('should get system health report', async () => {
      const tool = getSystemHealthTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(mockClient.getHealth).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'System Health Report'
      );
    });

    it('should include CLI status when requested', async () => {
      const tool = getSystemHealthTool(mockServer, clientFactory);

      const result = await tool.handler({ include_cli_status: true });

      expect(mockClient.getCliStatus).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'CLI Status'
      );
    });
  });

  describe('action_health', () => {
    it('should cleanup processes', async () => {
      const tool = actionHealthTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'cleanup_processes' });

      expect(mockClient.cleanupProcesses).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Processes Cleaned Up'
      );
    });

    it('should retry sessions', async () => {
      const tool = actionHealthTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'retry_sessions' });

      expect(mockClient.retrySessions).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Sessions Retried'
      );
    });

    it('should refresh CLI', async () => {
      const tool = actionHealthTool(mockServer, clientFactory);

      const result = await tool.handler({ action: 'cli_refresh' });

      expect(mockClient.refreshCli).toHaveBeenCalled();
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'CLI Refresh'
      );
    });
  });

  describe('get_configs', () => {
    beforeEach(() => {
      // Clear the cache before each test
      clearConfigsCache();
    });

    it('should fetch all configs', async () => {
      const tool = getConfigsTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      const text = (result as { content: Array<{ text: string }> }).content[0].text;

      // Check MCP Servers section
      expect(text).toContain('## MCP Servers');
      expect(text).toContain('GitHub Development');
      expect(text).toContain('github-development');

      // Check Agent Roots section
      expect(text).toContain('## Agent Roots');
      expect(text).toContain('MCP Servers');
      expect(text).toContain('mcp-servers');
      expect(text).toContain('pulsemcp/mcp-servers.git');

      // Check Stop Conditions section
      expect(text).toContain('## Stop Conditions');
      expect(text).toContain('PR Merged');
      expect(text).toContain('pr_merged');

      expect(mockClient.getConfigs).toHaveBeenCalledTimes(1);
    });

    it('should use cache on subsequent calls', async () => {
      const tool = getConfigsTool(mockServer, clientFactory);

      // First call
      await tool.handler({});
      expect(mockClient.getConfigs).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result = await tool.handler({});
      expect(mockClient.getConfigs).toHaveBeenCalledTimes(1); // Still 1

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Returned from cache'
      );
    });

    it('should refresh cache when force_refresh is true', async () => {
      const tool = getConfigsTool(mockServer, clientFactory);

      // First call populates cache
      await tool.handler({});
      expect(mockClient.getConfigs).toHaveBeenCalledTimes(1);

      // Second call with force_refresh should fetch again
      const result = await tool.handler({ force_refresh: true });
      expect(mockClient.getConfigs).toHaveBeenCalledTimes(2);

      expect((result as { content: Array<{ text: string }> }).content[0].text).not.toContain(
        'Returned from cache'
      );
    });

    it('should handle empty configs', async () => {
      mockClient.getConfigs = vi.fn().mockResolvedValue({
        mcp_servers: [],
        agent_roots: [],
        stop_conditions: [],
      });

      const tool = getConfigsTool(mockServer, clientFactory);

      const result = await tool.handler({});
      const text = (result as { content: Array<{ text: string }> }).content[0].text;

      expect(text).toContain('No MCP servers available');
      expect(text).toContain('No agent roots configured');
      expect(text).toContain('No stop conditions defined');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getConfigs = vi.fn().mockRejectedValue(new Error('API connection failed'));

      const tool = getConfigsTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'API connection failed'
      );
    });
  });

  describe('send_push_notification', () => {
    it('should send a push notification', async () => {
      const tool = sendPushNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        message: 'Needs API key to proceed',
      });

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Push Notification Sent');
      expect(text).toContain('Session ID');
      expect(text).toContain('**Notification:** Needs API key to proceed');
      expect(text).toContain('**Status:** Push notification queued');
      expect(mockClient.sendPushNotification).toHaveBeenCalledWith(1, 'Needs API key to proceed');
    });

    it('should handle API errors gracefully', async () => {
      mockClient.sendPushNotification = vi
        .fn()
        .mockRejectedValue(new Error('API Error (404): Session not found'));

      const tool = sendPushNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 999,
        message: 'Test message',
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session not found'
      );
    });

    it('should handle success:false response', async () => {
      mockClient.sendPushNotification = vi.fn().mockResolvedValue({
        success: false,
        message: 'Push notifications not enabled',
        session_id: 1,
      });

      const tool = sendPushNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        message: 'Test message',
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Push notifications not enabled'
      );
    });

    it('should require both session_id and message', async () => {
      const tool = sendPushNotificationTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        // Missing message
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('get_transcript_archive', () => {
    it('should return transcript archive info with download URL', async () => {
      const tool = getTranscriptArchiveTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result).toMatchObject({
        content: [{ type: 'text' }],
      });
      const text = (result as { content: Array<{ text: string }> }).content[0].text;
      expect(text).toContain('Transcript Archive');
      expect(text).toContain('Generated At');
      expect(text).toContain('Session Count');
      expect(text).toContain('42');
      expect(text).toContain('File Size');
      expect(text).toContain('1.0 MB');
      expect(text).toContain('transcript_archive/download');
      expect(text).toContain('curl');
      expect(mockClient.getTranscriptArchiveStatus).toHaveBeenCalledTimes(1);
      expect(mockClient.getTranscriptArchiveDownloadUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      mockClient.getTranscriptArchiveStatus = vi
        .fn()
        .mockRejectedValue(
          new Error(
            'API Error (404): No transcript archive exists yet. The archive is built every 10 minutes.'
          )
        );

      const tool = getTranscriptArchiveTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'No transcript archive exists yet'
      );
    });
  });

  describe('tool definitions', () => {
    it('should have correct tool definitions for all 14 tools', () => {
      const tools = [
        quickSearchSessionsTool(mockServer, clientFactory),
        startSessionTool(mockServer, clientFactory),
        getSessionTool(mockServer, clientFactory),
        actionSessionTool(mockServer, clientFactory),
        getConfigsTool(mockServer, clientFactory),
        getTranscriptArchiveTool(mockServer, clientFactory),
        manageEnqueuedMessagesTool(mockServer, clientFactory),
        sendPushNotificationTool(mockServer, clientFactory),
        getNotificationsTool(mockServer, clientFactory),
        actionNotificationTool(mockServer, clientFactory),
        searchTriggersTool(mockServer, clientFactory),
        actionTriggerTool(mockServer, clientFactory),
        getSystemHealthTool(mockServer, clientFactory),
        actionHealthTool(mockServer, clientFactory),
      ];

      expect(tools).toHaveLength(14);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('quick_search_sessions');
      expect(toolNames).toContain('start_session');
      expect(toolNames).toContain('get_session');
      expect(toolNames).toContain('action_session');
      expect(toolNames).toContain('get_configs');
      expect(toolNames).toContain('get_transcript_archive');
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
});

describe('parseEnabledToolGroups', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return all base groups when no parameter provided', () => {
    const groups = parseEnabledToolGroups();
    expect(groups).toEqual(['sessions', 'notifications', 'triggers', 'health']);
  });

  it('should return all base groups when empty string provided', () => {
    const groups = parseEnabledToolGroups('');
    expect(groups).toEqual(['sessions', 'notifications', 'triggers', 'health']);
  });

  it('should parse valid tool groups from parameter', () => {
    const groups = parseEnabledToolGroups('sessions,notifications');
    expect(groups).toEqual(['sessions', 'notifications']);
  });

  it('should parse single group', () => {
    const groups = parseEnabledToolGroups('sessions');
    expect(groups).toEqual(['sessions']);
  });

  it('should parse readonly variants', () => {
    const groups = parseEnabledToolGroups('sessions_readonly');
    expect(groups).toEqual(['sessions_readonly']);
  });

  it('should handle whitespace in group names', () => {
    const groups = parseEnabledToolGroups(' sessions , notifications ');
    expect(groups).toEqual(['sessions', 'notifications']);
  });

  it('should filter out invalid group names', () => {
    const groups = parseEnabledToolGroups('sessions,invalid_group,notifications');
    expect(groups).toEqual(['sessions', 'notifications']);
  });

  it('should deduplicate groups', () => {
    const groups = parseEnabledToolGroups('sessions,sessions,notifications');
    expect(groups).toEqual(['sessions', 'notifications']);
  });

  it('should allow mixing base and readonly groups', () => {
    const groups = parseEnabledToolGroups('sessions_readonly,notifications');
    expect(groups).toEqual(['sessions_readonly', 'notifications']);
  });

  it('should parse trigger and health groups', () => {
    const groups = parseEnabledToolGroups('triggers,health');
    expect(groups).toEqual(['triggers', 'health']);
  });

  it('should parse trigger and health readonly groups', () => {
    const groups = parseEnabledToolGroups('triggers_readonly,health_readonly');
    expect(groups).toEqual(['triggers_readonly', 'health_readonly']);
  });

  it('should prioritize parameter over environment variable', () => {
    process.env = { ...originalEnv, TOOL_GROUPS: 'notifications' };

    const groups = parseEnabledToolGroups('sessions');
    expect(groups).toEqual(['sessions']);
  });

  it('should read from TOOL_GROUPS env var when no parameter provided', () => {
    process.env = { ...originalEnv, TOOL_GROUPS: 'sessions_readonly' };

    const groups = parseEnabledToolGroups();
    expect(groups).toEqual(['sessions_readonly']);
  });
});

describe('createRegisterTools with toolgroups filtering', () => {
  it('should register only read-only session tools when sessions_readonly group is enabled', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2, 'sessions_readonly');
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(4);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('quick_search_sessions');
    expect(toolNames).toContain('get_session');
    expect(toolNames).toContain('get_configs');
    expect(toolNames).toContain('get_transcript_archive');
    expect(toolNames).not.toContain('start_session');
    expect(toolNames).not.toContain('action_session');
    expect(toolNames).not.toContain('manage_enqueued_messages');
  });

  it('should register all session tools when sessions group is enabled', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2, 'sessions');
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(7);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('quick_search_sessions');
    expect(toolNames).toContain('get_session');
    expect(toolNames).toContain('get_configs');
    expect(toolNames).toContain('get_transcript_archive');
    expect(toolNames).toContain('start_session');
    expect(toolNames).toContain('action_session');
    expect(toolNames).toContain('manage_enqueued_messages');
  });

  it('should register notification tools when notifications group is enabled', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2, 'notifications');
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('get_notifications');
    expect(toolNames).toContain('send_push_notification');
    expect(toolNames).toContain('action_notification');
  });

  it('should register only read notification tools when notifications_readonly', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2, 'notifications_readonly');
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('get_notifications');
    expect(toolNames).not.toContain('send_push_notification');
    expect(toolNames).not.toContain('action_notification');
  });

  it('should register trigger tools when triggers group is enabled', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2, 'triggers');
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('search_triggers');
    expect(toolNames).toContain('action_trigger');
  });

  it('should register health tools when health group is enabled', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2, 'health');
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('get_system_health');
    expect(toolNames).toContain('action_health');
  });

  it('should register all 14 tools when all base groups are enabled (default)', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2);
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(14);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('quick_search_sessions');
    expect(toolNames).toContain('get_session');
    expect(toolNames).toContain('get_configs');
    expect(toolNames).toContain('get_transcript_archive');
    expect(toolNames).toContain('start_session');
    expect(toolNames).toContain('action_session');
    expect(toolNames).toContain('manage_enqueued_messages');
    expect(toolNames).toContain('send_push_notification');
    expect(toolNames).toContain('get_notifications');
    expect(toolNames).toContain('action_notification');
    expect(toolNames).toContain('search_triggers');
    expect(toolNames).toContain('action_trigger');
    expect(toolNames).toContain('get_system_health');
    expect(toolNames).toContain('action_health');
  });

  it('should register session readonly + notifications when both specified', async () => {
    const mockClient2 = createMockOrchestratorClient();
    const mockServer = new Server(
      { name: 'test', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    const clientFactory2 = () => mockClient2;

    const registerTools = createRegisterTools(clientFactory2, 'sessions_readonly,notifications');
    registerTools(mockServer);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers = (mockServer as any)._requestHandlers;
    const listToolsHandler = handlers.get('tools/list');
    const result = await listToolsHandler({ method: 'tools/list', params: {} });

    expect(result.tools).toHaveLength(7); // 4 readonly sessions + 3 notification
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolNames = result.tools.map((t: any) => t.name);
    expect(toolNames).toContain('quick_search_sessions');
    expect(toolNames).toContain('get_session');
    expect(toolNames).toContain('get_configs');
    expect(toolNames).toContain('get_transcript_archive');
    expect(toolNames).toContain('get_notifications');
    expect(toolNames).toContain('send_push_notification');
    expect(toolNames).toContain('action_notification');
    expect(toolNames).not.toContain('start_session');
    expect(toolNames).not.toContain('action_session');
  });
});

// =============================================================================
// ALLOWED_AGENT_ROOTS Tests
// =============================================================================

describe('parseAllowedAgentRoots', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return null when no env var is set and no param provided', () => {
    delete process.env.ALLOWED_AGENT_ROOTS;
    expect(parseAllowedAgentRoots()).toBeNull();
  });

  it('should return null for empty string', () => {
    expect(parseAllowedAgentRoots('')).toBeNull();
  });

  it('should return null for whitespace-only string', () => {
    expect(parseAllowedAgentRoots('   ')).toBeNull();
  });

  it('should parse single agent root', () => {
    expect(parseAllowedAgentRoots('mcp-servers')).toEqual(['mcp-servers']);
  });

  it('should parse comma-separated list', () => {
    expect(parseAllowedAgentRoots('mcp-servers,my-app')).toEqual(['mcp-servers', 'my-app']);
  });

  it('should trim whitespace around names', () => {
    expect(parseAllowedAgentRoots(' mcp-servers , my-app ')).toEqual(['mcp-servers', 'my-app']);
  });

  it('should filter out empty entries from extra commas', () => {
    expect(parseAllowedAgentRoots('mcp-servers,,my-app,')).toEqual(['mcp-servers', 'my-app']);
  });

  it('should read from ALLOWED_AGENT_ROOTS env var when no param provided', () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };
    expect(parseAllowedAgentRoots()).toEqual(['mcp-servers']);
  });

  it('should prioritize explicit param over env var', () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'env-root' };
    expect(parseAllowedAgentRoots('param-root')).toEqual(['param-root']);
  });
});

describe('filterAgentRoots', () => {
  const agentRoots: AgentRootInfo[] = [
    {
      name: 'mcp-servers',
      title: 'MCP Servers',
      description: 'MCP servers monorepo',
      git_root: 'https://github.com/pulsemcp/mcp-servers.git',
      default_mcp_servers: ['github-development'],
    },
    {
      name: 'my-app',
      title: 'My App',
      description: 'My application',
      git_root: 'https://github.com/example/my-app.git',
      default_mcp_servers: ['slack'],
    },
    {
      name: 'other-repo',
      title: 'Other Repo',
      description: 'Another repository',
      git_root: 'https://github.com/example/other.git',
    },
  ];

  it('should return all roots when allowedRoots is null', () => {
    expect(filterAgentRoots(agentRoots, null)).toEqual(agentRoots);
  });

  it('should filter to only allowed roots', () => {
    const result = filterAgentRoots(agentRoots, ['mcp-servers']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('mcp-servers');
  });

  it('should handle multiple allowed roots', () => {
    const result = filterAgentRoots(agentRoots, ['mcp-servers', 'my-app']);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['mcp-servers', 'my-app']);
  });

  it('should return empty array when no roots match', () => {
    const result = filterAgentRoots(agentRoots, ['nonexistent']);
    expect(result).toHaveLength(0);
  });
});

describe('validateAgentRootConstraints', () => {
  const agentRoots: AgentRootInfo[] = [
    {
      name: 'mcp-servers',
      title: 'MCP Servers',
      description: 'MCP servers monorepo',
      git_root: 'https://github.com/pulsemcp/mcp-servers.git',
      default_mcp_servers: ['github-development'],
    },
    {
      name: 'my-app',
      title: 'My App',
      description: 'My application',
      git_root: 'https://github.com/example/my-app.git',
      default_mcp_servers: ['slack', 'github-development'],
    },
    {
      name: 'no-servers',
      title: 'No Servers',
      description: 'Repo with no default servers',
      git_root: 'https://github.com/example/no-servers.git',
    },
  ];

  it('should allow any request when allowedRoots is null', () => {
    const result = validateAgentRootConstraints(null, agentRoots, 'any-git-root', ['any-server']);
    expect(result.valid).toBe(true);
  });

  it('should allow matching git_root with correct default servers', () => {
    const result = validateAgentRootConstraints(
      ['mcp-servers'],
      agentRoots,
      'https://github.com/pulsemcp/mcp-servers.git',
      ['github-development']
    );
    expect(result.valid).toBe(true);
  });

  it('should allow matching with multiple default servers in any order', () => {
    const result = validateAgentRootConstraints(
      ['my-app'],
      agentRoots,
      'https://github.com/example/my-app.git',
      ['github-development', 'slack']
    );
    expect(result.valid).toBe(true);
  });

  it('should reject non-allowed git_root', () => {
    const result = validateAgentRootConstraints(
      ['mcp-servers'],
      agentRoots,
      'https://github.com/example/my-app.git',
      ['slack']
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('ALLOWED_AGENT_ROOTS');
    expect(result.error).toContain('does not match');
  });

  it('should reject when mcp_servers has extra servers', () => {
    const result = validateAgentRootConstraints(
      ['mcp-servers'],
      agentRoots,
      'https://github.com/pulsemcp/mcp-servers.git',
      ['github-development', 'slack']
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exact default MCP servers');
  });

  it('should reject when mcp_servers is missing servers', () => {
    const result = validateAgentRootConstraints(
      ['my-app'],
      agentRoots,
      'https://github.com/example/my-app.git',
      ['slack']
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exact default MCP servers');
  });

  it('should reject when mcp_servers is empty but defaults exist', () => {
    const result = validateAgentRootConstraints(
      ['mcp-servers'],
      agentRoots,
      'https://github.com/pulsemcp/mcp-servers.git',
      []
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exact default MCP servers');
  });

  it('should allow empty mcp_servers when agent root has no defaults', () => {
    const result = validateAgentRootConstraints(
      ['no-servers'],
      agentRoots,
      'https://github.com/example/no-servers.git',
      []
    );
    expect(result.valid).toBe(true);
  });

  it('should reject when git_root is not provided', () => {
    const result = validateAgentRootConstraints(['mcp-servers'], agentRoots, undefined, [
      'github-development',
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('(not provided)');
  });

  it('should reject servers for agent root with no default servers', () => {
    const result = validateAgentRootConstraints(
      ['no-servers'],
      agentRoots,
      'https://github.com/example/no-servers.git',
      ['some-server']
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exact default MCP servers');
  });

  it('should allow undefined mcp_servers when agent root has no defaults', () => {
    const result = validateAgentRootConstraints(
      ['no-servers'],
      agentRoots,
      'https://github.com/example/no-servers.git',
      undefined
    );
    expect(result.valid).toBe(true);
  });

  it('should reject undefined mcp_servers when agent root has default servers', () => {
    const result = validateAgentRootConstraints(
      ['mcp-servers'],
      agentRoots,
      'https://github.com/pulsemcp/mcp-servers.git',
      undefined
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exact default MCP servers');
  });

  // Subdirectory disambiguation tests — multiple agent roots sharing the same git_root
  describe('subdirectory disambiguation', () => {
    const monorepoRoots: AgentRootInfo[] = [
      {
        name: 'onboarding-research',
        title: 'Research',
        description: 'Research subagent',
        git_root: 'https://github.com/pulsemcp/agents.git',
        default_branch: 'main',
        default_subdirectory: 'agent-roots/server-onboarding/subagents/research-and-catalog',
        default_mcp_servers: ['pulse-server-directory-rw', 'pulse-redirects-rw'],
      },
      {
        name: 'onboarding-configs',
        title: 'Configs',
        description: 'Configs subagent',
        git_root: 'https://github.com/pulsemcp/agents.git',
        default_branch: 'main',
        default_subdirectory: 'agent-roots/server-onboarding/subagents/prepare-configs',
        default_mcp_servers: ['remote-fs-screenshots', 'svg-tracer'],
      },
      {
        name: 'onboarding-proctor',
        title: 'Proctor',
        description: 'Proctor subagent',
        git_root: 'https://github.com/pulsemcp/agents.git',
        default_branch: 'main',
        default_subdirectory: 'agent-roots/server-onboarding/subagents/test-with-proctor',
        default_mcp_servers: ['proctor-rw'],
      },
      {
        name: 'onboarding-save',
        title: 'Save',
        description: 'Save subagent',
        git_root: 'https://github.com/pulsemcp/agents.git',
        default_branch: 'main',
        default_subdirectory: 'agent-roots/server-onboarding/subagents/save-to-production',
        default_mcp_servers: ['pulse-mirror-mgmt-rw', 'gcs-dewey-icons-rw'],
      },
    ];

    const allAllowed = [
      'onboarding-research',
      'onboarding-configs',
      'onboarding-proctor',
      'onboarding-save',
    ];

    it('should match correct agent root by subdirectory when multiple share same git_root', () => {
      const result = validateAgentRootConstraints(
        allAllowed,
        monorepoRoots,
        'https://github.com/pulsemcp/agents.git',
        ['pulse-mirror-mgmt-rw', 'gcs-dewey-icons-rw'],
        'main',
        'agent-roots/server-onboarding/subagents/save-to-production'
      );
      expect(result.valid).toBe(true);
    });

    it('should match research agent root by subdirectory', () => {
      const result = validateAgentRootConstraints(
        allAllowed,
        monorepoRoots,
        'https://github.com/pulsemcp/agents.git',
        ['pulse-server-directory-rw', 'pulse-redirects-rw'],
        'main',
        'agent-roots/server-onboarding/subagents/research-and-catalog'
      );
      expect(result.valid).toBe(true);
    });

    it('should reject wrong mcp_servers even with correct subdirectory', () => {
      const result = validateAgentRootConstraints(
        allAllowed,
        monorepoRoots,
        'https://github.com/pulsemcp/agents.git',
        ['pulse-mirror-mgmt-rw', 'gcs-dewey-icons-rw'],
        'main',
        'agent-roots/server-onboarding/subagents/research-and-catalog'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exact default MCP servers');
      expect(result.error).toContain('onboarding-research');
    });

    it('should reject when subdirectory does not match any allowed root', () => {
      const result = validateAgentRootConstraints(
        allAllowed,
        monorepoRoots,
        'https://github.com/pulsemcp/agents.git',
        ['some-server'],
        'main',
        'agent-roots/server-onboarding/subagents/nonexistent'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not match');
    });

    it('should still work with single candidate (no disambiguation needed)', () => {
      const result = validateAgentRootConstraints(
        ['onboarding-save'],
        monorepoRoots,
        'https://github.com/pulsemcp/agents.git',
        ['pulse-mirror-mgmt-rw', 'gcs-dewey-icons-rw']
      );
      expect(result.valid).toBe(true);
    });

    it('should match by subdirectory alone when branch is not provided', () => {
      const result = validateAgentRootConstraints(
        allAllowed,
        monorepoRoots,
        'https://github.com/pulsemcp/agents.git',
        ['proctor-rw'],
        undefined,
        'agent-roots/server-onboarding/subagents/test-with-proctor'
      );
      expect(result.valid).toBe(true);
    });
  });
});

describe('ALLOWED_AGENT_ROOTS integration with get_configs', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOrchestratorClient>;
  let clientFactory: () => ReturnType<typeof createMockOrchestratorClient>;
  const originalEnv = process.env;

  beforeEach(() => {
    mockServer = {} as Server;
    mockClient = createMockOrchestratorClient();
    clientFactory = () => mockClient;
    clearConfigsCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearConfigsCache();
  });

  it('should filter agent roots when ALLOWED_AGENT_ROOTS is set', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = getConfigsTool(mockServer, clientFactory);
    const result = await tool.handler({});
    const text = (result as { content: Array<{ text: string }> }).content[0].text;

    expect(text).toContain('mcp-servers');
    // The mock only has 'mcp-servers' agent root, so it should appear
    expect(text).toContain('## Agent Roots');
  });

  it('should show no agent roots when ALLOWED_AGENT_ROOTS excludes all', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'nonexistent-root' };

    const tool = getConfigsTool(mockServer, clientFactory);
    const result = await tool.handler({});
    const text = (result as { content: Array<{ text: string }> }).content[0].text;

    expect(text).toContain('No agent roots configured');
  });

  it('should show all agent roots when ALLOWED_AGENT_ROOTS is not set', async () => {
    delete process.env.ALLOWED_AGENT_ROOTS;

    const tool = getConfigsTool(mockServer, clientFactory);
    const result = await tool.handler({});
    const text = (result as { content: Array<{ text: string }> }).content[0].text;

    expect(text).toContain('mcp-servers');
    expect(text).toContain('MCP Servers');
  });
});

describe('ALLOWED_AGENT_ROOTS integration with start_session', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOrchestratorClient>;
  let clientFactory: () => ReturnType<typeof createMockOrchestratorClient>;
  const originalEnv = process.env;

  beforeEach(() => {
    mockServer = {} as Server;
    mockClient = createMockOrchestratorClient();
    clientFactory = () => mockClient;
    clearConfigsCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    clearConfigsCache();
  });

  it('should allow session with correct agent root and default servers', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = startSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      git_root: 'https://github.com/pulsemcp/mcp-servers.git',
      mcp_servers: ['github-development'],
      title: 'Test Session',
    });

    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('Session Started Successfully');
    expect(mockClient.createSession).toHaveBeenCalled();
  });

  it('should reject session with non-allowed git_root', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = startSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      git_root: 'https://github.com/unauthorized/repo.git',
      mcp_servers: ['github-development'],
      title: 'Test Session',
    });

    expect(result.isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('ALLOWED_AGENT_ROOTS');
    expect(text).toContain('does not match');
    expect(mockClient.createSession).not.toHaveBeenCalled();
  });

  it('should reject session with extra MCP servers', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = startSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      git_root: 'https://github.com/pulsemcp/mcp-servers.git',
      mcp_servers: ['github-development', 'slack'],
      title: 'Test Session',
    });

    expect(result.isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('exact default MCP servers');
    expect(mockClient.createSession).not.toHaveBeenCalled();
  });

  it('should reject session with fewer MCP servers than default', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = startSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      git_root: 'https://github.com/pulsemcp/mcp-servers.git',
      mcp_servers: [],
      title: 'Test Session',
    });

    expect(result.isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('exact default MCP servers');
    expect(mockClient.createSession).not.toHaveBeenCalled();
  });

  it('should allow session with no restrictions when env var not set', async () => {
    delete process.env.ALLOWED_AGENT_ROOTS;

    const tool = startSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      git_root: 'https://github.com/any/repo.git',
      mcp_servers: ['any-server'],
      title: 'Test Session',
    });

    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('Session Started Successfully');
    expect(mockClient.createSession).toHaveBeenCalled();
  });

  it('should fetch configs from API when cache is empty', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = startSessionTool(mockServer, clientFactory);
    await tool.handler({
      git_root: 'https://github.com/pulsemcp/mcp-servers.git',
      mcp_servers: ['github-development'],
      title: 'Test Session',
    });

    // Should have fetched configs since cache was empty
    expect(mockClient.getConfigs).toHaveBeenCalledTimes(1);
  });

  it('should disambiguate by subdirectory when multiple roots share same git_root', async () => {
    process.env = {
      ...originalEnv,
      ALLOWED_AGENT_ROOTS: 'onboarding-research,onboarding-save',
    };

    // Override mock to return monorepo-style agent roots
    mockClient.getConfigs = vi.fn().mockResolvedValue({
      mcp_servers: [],
      agent_roots: [
        {
          name: 'onboarding-research',
          title: 'Research',
          description: 'Research subagent',
          git_root: 'https://github.com/pulsemcp/agents.git',
          default_branch: 'main',
          default_subdirectory: 'subagents/research',
          default_mcp_servers: ['server-directory-rw'],
        },
        {
          name: 'onboarding-save',
          title: 'Save',
          description: 'Save subagent',
          git_root: 'https://github.com/pulsemcp/agents.git',
          default_branch: 'main',
          default_subdirectory: 'subagents/save',
          default_mcp_servers: ['mirror-mgmt-rw'],
        },
      ],
      stop_conditions: [],
    });

    const tool = startSessionTool(mockServer, clientFactory);

    // Should match onboarding-save by subdirectory (not first match onboarding-research)
    const result = await tool.handler({
      git_root: 'https://github.com/pulsemcp/agents.git',
      branch: 'main',
      subdirectory: 'subagents/save',
      mcp_servers: ['mirror-mgmt-rw'],
      title: 'Test Save Session',
    });

    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('Session Started Successfully');
    expect(mockClient.createSession).toHaveBeenCalled();
  });

  it('should reject when subdirectory matches but mcp_servers are wrong', async () => {
    process.env = {
      ...originalEnv,
      ALLOWED_AGENT_ROOTS: 'onboarding-research,onboarding-save',
    };

    mockClient.getConfigs = vi.fn().mockResolvedValue({
      mcp_servers: [],
      agent_roots: [
        {
          name: 'onboarding-research',
          title: 'Research',
          description: 'Research subagent',
          git_root: 'https://github.com/pulsemcp/agents.git',
          default_branch: 'main',
          default_subdirectory: 'subagents/research',
          default_mcp_servers: ['server-directory-rw'],
        },
        {
          name: 'onboarding-save',
          title: 'Save',
          description: 'Save subagent',
          git_root: 'https://github.com/pulsemcp/agents.git',
          default_branch: 'main',
          default_subdirectory: 'subagents/save',
          default_mcp_servers: ['mirror-mgmt-rw'],
        },
      ],
      stop_conditions: [],
    });

    const tool = startSessionTool(mockServer, clientFactory);

    // Correct subdirectory for save, but wrong mcp_servers (research's servers)
    const result = await tool.handler({
      git_root: 'https://github.com/pulsemcp/agents.git',
      branch: 'main',
      subdirectory: 'subagents/save',
      mcp_servers: ['server-directory-rw'],
      title: 'Test Session',
    });

    expect(result.isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('exact default MCP servers');
    expect(text).toContain('onboarding-save');
    expect(mockClient.createSession).not.toHaveBeenCalled();
  });
});

describe('ALLOWED_AGENT_ROOTS integration with action_session', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOrchestratorClient>;
  let clientFactory: () => ReturnType<typeof createMockOrchestratorClient>;
  const originalEnv = process.env;

  beforeEach(() => {
    mockServer = {} as Server;
    mockClient = createMockOrchestratorClient();
    clientFactory = () => mockClient;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should block change_mcp_servers when ALLOWED_AGENT_ROOTS is set', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = actionSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      session_id: 1,
      action: 'change_mcp_servers',
      mcp_servers: ['slack'],
    });

    expect(result.isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('ALLOWED_AGENT_ROOTS');
    expect(text).toContain('change_mcp_servers');
    expect(mockClient.changeMcpServers).not.toHaveBeenCalled();
  });

  it('should allow change_mcp_servers when ALLOWED_AGENT_ROOTS is not set', async () => {
    delete process.env.ALLOWED_AGENT_ROOTS;

    const tool = actionSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      session_id: 1,
      action: 'change_mcp_servers',
      mcp_servers: ['slack'],
    });

    expect(result.isError).toBeUndefined();
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('MCP Servers Updated');
    expect(mockClient.changeMcpServers).toHaveBeenCalled();
  });

  it('should allow other actions when ALLOWED_AGENT_ROOTS is set', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = actionSessionTool(mockServer, clientFactory);
    const result = await tool.handler({
      session_id: 1,
      action: 'pause',
    });

    expect(result.isError).toBeUndefined();
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('Session Paused');
  });
});

describe('ALLOWED_AGENT_ROOTS integration with action_trigger', () => {
  let mockServer: Server;
  let mockClient: ReturnType<typeof createMockOrchestratorClient>;
  let clientFactory: () => ReturnType<typeof createMockOrchestratorClient>;
  const originalEnv = process.env;

  beforeEach(() => {
    mockServer = {} as Server;
    mockClient = createMockOrchestratorClient();
    clientFactory = () => mockClient;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should block create when ALLOWED_AGENT_ROOTS is set', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = actionTriggerTool(mockServer, clientFactory);
    const result = await tool.handler({
      action: 'create',
      name: 'test-trigger',
      trigger_type: 'slack',
      agent_root_name: 'mcp-servers',
      prompt_template: 'Test prompt',
    });

    expect(result.isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('ALLOWED_AGENT_ROOTS');
    expect(text).toContain('create');
    expect(mockClient.createTrigger).not.toHaveBeenCalled();
  });

  it('should block update when ALLOWED_AGENT_ROOTS is set', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = actionTriggerTool(mockServer, clientFactory);
    const result = await tool.handler({
      action: 'update',
      id: 1,
      name: 'updated-trigger',
    });

    expect(result.isError).toBe(true);
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('ALLOWED_AGENT_ROOTS');
    expect(text).toContain('update');
    expect(mockClient.updateTrigger).not.toHaveBeenCalled();
  });

  it('should allow delete when ALLOWED_AGENT_ROOTS is set', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = actionTriggerTool(mockServer, clientFactory);
    const result = await tool.handler({
      action: 'delete',
      id: 1,
    });

    expect(result.isError).toBeUndefined();
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('Trigger Deleted');
    expect(mockClient.deleteTrigger).toHaveBeenCalled();
  });

  it('should allow toggle when ALLOWED_AGENT_ROOTS is set', async () => {
    process.env = { ...originalEnv, ALLOWED_AGENT_ROOTS: 'mcp-servers' };

    const tool = actionTriggerTool(mockServer, clientFactory);
    const result = await tool.handler({
      action: 'toggle',
      id: 1,
    });

    expect(result.isError).toBeUndefined();
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('Trigger Toggled');
    expect(mockClient.toggleTrigger).toHaveBeenCalled();
  });

  it('should allow create when ALLOWED_AGENT_ROOTS is not set', async () => {
    delete process.env.ALLOWED_AGENT_ROOTS;

    const tool = actionTriggerTool(mockServer, clientFactory);
    const result = await tool.handler({
      action: 'create',
      name: 'test-trigger',
      trigger_type: 'slack',
      agent_root_name: 'mcp-servers',
      prompt_template: 'Test prompt',
    });

    expect(result.isError).toBeUndefined();
    const text = (result as { content: Array<{ text: string }> }).content[0].text;
    expect(text).toContain('Trigger Created');
    expect(mockClient.createTrigger).toHaveBeenCalled();
  });
});
