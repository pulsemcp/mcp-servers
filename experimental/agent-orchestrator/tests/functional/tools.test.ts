import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockOrchestratorClient } from '../mocks/orchestrator-client.functional-mock.js';
import { searchSessionsTool } from '../../shared/src/tools/search-sessions.js';
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

  describe('search_sessions', () => {
    it('should list all sessions when no filters provided', async () => {
      const tool = searchSessionsTool(mockServer, clientFactory);

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
      const tool = searchSessionsTool(mockServer, clientFactory);

      await tool.handler({ query: 'test' });

      expect(mockClient.searchSessions).toHaveBeenCalledWith('test', expect.anything());
    });

    it('should get session by ID', async () => {
      const tool = searchSessionsTool(mockServer, clientFactory);

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
      const tool = searchSessionsTool(mockServer, clientFactory);

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
        searchSessionsTool(mockServer, clientFactory),
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
      expect(toolNames).toContain('search_sessions');
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
    expect(toolNames).toContain('search_sessions');
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
    expect(toolNames).toContain('search_sessions');
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
    expect(toolNames).toContain('search_sessions');
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
    expect(toolNames).toContain('search_sessions');
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
