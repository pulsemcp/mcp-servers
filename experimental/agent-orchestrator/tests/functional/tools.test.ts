import { describe, it, expect, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockOrchestratorClient } from '../mocks/orchestrator-client.functional-mock.js';
import { listSessionsTool } from '../../shared/src/tools/list-sessions.js';
import { getSessionTool } from '../../shared/src/tools/get-session.js';
import { createSessionTool } from '../../shared/src/tools/create-session.js';
import {
  followUpTool,
  pauseSessionTool,
  restartSessionTool,
  archiveSessionTool,
} from '../../shared/src/tools/session-actions.js';
import { listLogsTool, createLogTool } from '../../shared/src/tools/logs.js';
import { listSubagentTranscriptsTool } from '../../shared/src/tools/subagent-transcripts.js';

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

  describe('list_sessions', () => {
    it('should list sessions successfully', async () => {
      const tool = listSessionsTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Test Session'
      );
      expect(mockClient.listSessions).toHaveBeenCalledTimes(1);
    });

    it('should filter by status', async () => {
      const tool = listSessionsTool(mockServer, clientFactory);

      await tool.handler({ status: 'running' });

      expect(mockClient.listSessions).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'running' })
      );
    });
  });

  describe('get_session', () => {
    it('should get session by ID', async () => {
      const tool = getSessionTool(mockServer, clientFactory);

      const result = await tool.handler({ id: 1 });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
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
  });

  describe('create_session', () => {
    it('should create a session', async () => {
      const tool = createSessionTool(mockServer, clientFactory);

      const result = await tool.handler({
        title: 'New Session',
        prompt: 'Do something',
        git_root: 'https://github.com/test/repo.git',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Created Successfully'
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

  describe('follow_up', () => {
    it('should send follow-up prompt', async () => {
      const tool = followUpTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        prompt: 'Continue with next step',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Follow-up Sent'
      );
      expect(mockClient.followUp).toHaveBeenCalledWith(1, 'Continue with next step');
    });

    it('should require prompt', async () => {
      const tool = followUpTool(mockServer, clientFactory);

      // Missing required prompt parameter will cause Zod validation to fail
      // The tool returns an error response instead of throwing
      const result = await tool.handler({
        session_id: 1,
        // Missing prompt
      });

      expect(result.isError).toBe(true);
      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Required'
      );
    });
  });

  describe('pause_session', () => {
    it('should pause a session', async () => {
      const tool = pauseSessionTool(mockServer, clientFactory);

      const result = await tool.handler({ session_id: 1 });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Paused'
      );
      expect(mockClient.pauseSession).toHaveBeenCalledWith(1);
    });
  });

  describe('restart_session', () => {
    it('should restart a session', async () => {
      const tool = restartSessionTool(mockServer, clientFactory);

      const result = await tool.handler({ session_id: 1 });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Restarted'
      );
      expect(mockClient.restartSession).toHaveBeenCalledWith(1);
    });
  });

  describe('archive_session', () => {
    it('should archive a session', async () => {
      const tool = archiveSessionTool(mockServer, clientFactory);

      const result = await tool.handler({ session_id: 1 });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Session Archived'
      );
      expect(mockClient.archiveSession).toHaveBeenCalledWith(1);
    });
  });

  describe('list_logs', () => {
    it('should list logs for a session', async () => {
      const tool = listLogsTool(mockServer, clientFactory);

      const result = await tool.handler({ session_id: 1 });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Test log message'
      );
      expect(mockClient.listLogs).toHaveBeenCalledWith(1, {});
    });
  });

  describe('create_log', () => {
    it('should create a log entry', async () => {
      const tool = createLogTool(mockServer, clientFactory);

      const result = await tool.handler({
        session_id: 1,
        content: 'New log entry',
        level: 'info',
      });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Log Created'
      );
      expect(mockClient.createLog).toHaveBeenCalledWith(1, {
        content: 'New log entry',
        level: 'info',
      });
    });
  });

  describe('list_subagent_transcripts', () => {
    it('should list subagent transcripts', async () => {
      const tool = listSubagentTranscriptsTool(mockServer, clientFactory);

      const result = await tool.handler({ session_id: 1 });

      expect((result as { content: Array<{ text: string }> }).content[0].text).toContain(
        'Test subagent'
      );
      expect(mockClient.listSubagentTranscripts).toHaveBeenCalledWith(1, {});
    });
  });

  describe('tool definitions', () => {
    it('should have correct tool definitions', () => {
      const tools = [
        listSessionsTool(mockServer, clientFactory),
        getSessionTool(mockServer, clientFactory),
        createSessionTool(mockServer, clientFactory),
        followUpTool(mockServer, clientFactory),
        pauseSessionTool(mockServer, clientFactory),
        restartSessionTool(mockServer, clientFactory),
        archiveSessionTool(mockServer, clientFactory),
        listLogsTool(mockServer, clientFactory),
        createLogTool(mockServer, clientFactory),
        listSubagentTranscriptsTool(mockServer, clientFactory),
      ];

      expect(tools).toHaveLength(10);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('list_sessions');
      expect(toolNames).toContain('get_session');
      expect(toolNames).toContain('create_session');
      expect(toolNames).toContain('follow_up');
      expect(toolNames).toContain('pause_session');
      expect(toolNames).toContain('restart_session');
      expect(toolNames).toContain('archive_session');
      expect(toolNames).toContain('list_logs');
      expect(toolNames).toContain('create_log');
      expect(toolNames).toContain('list_subagent_transcripts');
    });
  });
});
