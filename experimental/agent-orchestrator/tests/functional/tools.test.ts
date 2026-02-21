import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockOrchestratorClient } from '../mocks/orchestrator-client.functional-mock.js';
import { searchSessionsTool } from '../../shared/src/tools/search-sessions.js';
import { startSessionTool } from '../../shared/src/tools/start-session.js';
import { getSessionTool } from '../../shared/src/tools/get-session.js';
import { actionSessionTool } from '../../shared/src/tools/action-session.js';
import { getConfigsTool } from '../../shared/src/tools/get-configs.js';
import { sendPushNotificationTool } from '../../shared/src/tools/send-push-notification.js';
import { clearConfigsCache } from '../../shared/src/cache/configs-cache.js';

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

  describe('tool definitions', () => {
    it('should have correct tool definitions', () => {
      const tools = [
        searchSessionsTool(mockServer, clientFactory),
        startSessionTool(mockServer, clientFactory),
        getSessionTool(mockServer, clientFactory),
        actionSessionTool(mockServer, clientFactory),
        getConfigsTool(mockServer, clientFactory),
        sendPushNotificationTool(mockServer, clientFactory),
      ];

      expect(tools).toHaveLength(6);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('search_sessions');
      expect(toolNames).toContain('start_session');
      expect(toolNames).toContain('get_session');
      expect(toolNames).toContain('action_session');
      expect(toolNames).toContain('get_configs');
      expect(toolNames).toContain('send_push_notification');
    });
  });
});
