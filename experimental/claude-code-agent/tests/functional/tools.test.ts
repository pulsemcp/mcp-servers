import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { FunctionalMockClaudeCodeClient } from '../mocks/claude-code-client.functional-mock.js';
import { promises as fs } from 'fs';
import { initAgentTool } from '../../shared/src/tools/init-agent.js';
import { findServersTool } from '../../shared/src/tools/find-servers.js';
import { installServersTool } from '../../shared/src/tools/install-servers.js';
import { chatTool } from '../../shared/src/tools/chat.js';
import { inspectTranscriptTool } from '../../shared/src/tools/inspect-transcript.js';
import { stopAgentTool } from '../../shared/src/tools/stop-agent.js';
import { getServerCapabilitiesTool } from '../../shared/src/tools/get-server-capabilities.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
  },
}));

describe('Tools', () => {
  let mockServer: Server;
  let mockClient: FunctionalMockClaudeCodeClient;
  const mockServerConfigsPath = '/mock/servers.json';
  let clientFactory: () => FunctionalMockClaudeCodeClient;

  beforeEach(() => {
    // Create minimal mock server for testing
    mockServer = {} as Server;
    mockClient = new FunctionalMockClaudeCodeClient();
    clientFactory = () => mockClient;

    // Mock fs.readFile for get_server_capabilities
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify([
        {
          name: 'com.postgres/mcp',
          description: 'PostgreSQL database integration',
          version: '1.0.0',
          packages: [
            {
              type: 'npm',
              name: 'postgres-mcp',
              command: 'npx',
              args: ['postgres-mcp'],
            },
          ],
        },
      ])
    );
  });

  describe('init_agent', () => {
    it('should initialize an agent with system prompt', async () => {
      const tool = initAgentTool(mockServer, clientFactory);

      const result = await tool.handler({
        system_prompt: 'You are a helpful assistant',
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult).toMatchObject({
        sessionId: expect.stringMatching(/^test-session-\d+$/),
        status: 'idle',
        stateUri: 'file:///tmp/test-agent/state.json',
      });
    });

    it('should validate required system_prompt', async () => {
      const tool = initAgentTool(mockServer, clientFactory);

      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid arguments');
    });
  });

  describe('find_servers', () => {
    it('should find relevant servers for database task', async () => {
      const tool = findServersTool(mockServer, clientFactory);

      const result = await tool.handler({
        task_prompt: 'I need to query a PostgreSQL database',
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.servers).toContainEqual({
        name: 'io.github.crystaldba/postgres',
        rationale: 'Database operations detected',
      });
      expect(parsedResult.servers).toContainEqual({
        name: 'com.pulsemcp/fetch',
        rationale: 'General web capabilities',
      });
    });

    it('should find monitoring servers for log analysis', async () => {
      const tool = findServersTool(mockServer, clientFactory);

      const result = await tool.handler({
        task_prompt: 'Analyze application logs and monitoring data',
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.servers).toContainEqual({
        name: 'com.pulsemcp/appsignal',
        rationale: 'Monitoring requirements detected',
      });
    });
  });

  describe('install_servers', () => {
    it('should install servers after agent is initialized', async () => {
      // First initialize agent
      await mockClient.initAgent('Test');

      // Then install servers
      const tool = installServersTool(mockServer, clientFactory);

      const result = await tool.handler({
        server_names: ['com.postgres/mcp', 'com.pulsemcp/fetch'],
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.installations).toHaveLength(2);
      expect(parsedResult.installations).toContainEqual({
        serverName: 'com.postgres/mcp',
        status: 'success',
      });
      expect(parsedResult.mcpConfigPath).toBe('/tmp/test-agent/.mcp.json');
    });

    it('should fail if no agent is initialized', async () => {
      const tool = installServersTool(mockServer, clientFactory);

      const result = await tool.handler({
        server_names: ['com.postgres/mcp'],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No agent initialized');
    });
  });

  describe('chat', () => {
    it('should send message to initialized agent', async () => {
      // Initialize agent
      await mockClient.initAgent('Test assistant');

      // Send chat message
      const tool = chatTool(mockServer, clientFactory);

      const result = await tool.handler({
        prompt: 'Hello, how are you?',
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.response).toBe('Mock response to: Hello, how are you?');
      expect(parsedResult.metadata).toMatchObject({
        tokensUsed: 50,
        duration: expect.any(Number),
        timestamp: expect.any(String),
      });
    });

    it('should support custom timeout', async () => {
      await mockClient.initAgent('Test');

      const tool = chatTool(mockServer, clientFactory);

      const result = await tool.handler({
        prompt: 'Test with timeout',
        timeout: 60000,
      });

      expect(result).toBeDefined();
    });
  });

  describe('inspect_transcript', () => {
    it('should return transcript URI after chat', async () => {
      // Initialize and chat
      await mockClient.initAgent('Test');
      await mockClient.chat('Test message');

      // Inspect transcript
      const tool = inspectTranscriptTool(mockServer, clientFactory);

      const result = await tool.handler({});

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.transcriptUri).toBe('file:///tmp/test-agent/transcript.markdown');
      expect(parsedResult.metadata.messageCount).toBe(2);
    });

    it('should support json format', async () => {
      await mockClient.initAgent('Test');

      const tool = inspectTranscriptTool(mockServer, clientFactory);

      const result = await tool.handler({
        format: 'json',
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.transcriptUri).toBe('file:///tmp/test-agent/transcript.json');
    });
  });

  describe('stop_agent', () => {
    it('should stop initialized agent gracefully', async () => {
      // Initialize agent
      await mockClient.initAgent('Test');

      // Stop agent
      const tool = stopAgentTool(mockServer, clientFactory);

      const result = await tool.handler({});

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.status).toBe('stopped');
      expect(parsedResult.finalState).toMatchObject({
        sessionId: expect.any(String),
        status: 'idle',
        systemPrompt: 'Test',
      });
    });

    it('should support force kill', async () => {
      await mockClient.initAgent('Test');

      const tool = stopAgentTool(mockServer, clientFactory);

      const result = await tool.handler({
        force: true,
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.status).toBe('force_killed');
    });
  });

  describe('get_server_capabilities', () => {
    it('should return capabilities for requested servers', async () => {
      const tool = getServerCapabilitiesTool(mockServer, mockServerConfigsPath);

      const result = await tool.handler({
        server_names: ['com.postgres/mcp'],
      });

      const parsedResult = JSON.parse(result.content[0].text);

      expect(parsedResult.servers).toHaveLength(1);
      expect(parsedResult.servers[0]).toMatchObject({
        name: 'com.postgres/mcp',
        description: 'PostgreSQL database integration',
        capabilities: expect.any(Object),
      });
    });
  });

  describe('tool definitions', () => {
    it('should have correct tool definitions', async () => {
      const tools = [
        initAgentTool(mockServer, clientFactory),
        findServersTool(mockServer, clientFactory),
        installServersTool(mockServer, clientFactory),
        chatTool(mockServer, clientFactory),
        inspectTranscriptTool(mockServer, clientFactory),
        stopAgentTool(mockServer, clientFactory),
        getServerCapabilitiesTool(mockServer, mockServerConfigsPath),
      ];

      expect(tools).toHaveLength(7);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('init_agent');
      expect(toolNames).toContain('find_servers');
      expect(toolNames).toContain('install_servers');
      expect(toolNames).toContain('chat');
      expect(toolNames).toContain('inspect_transcript');
      expect(toolNames).toContain('stop_agent');
      expect(toolNames).toContain('get_server_capabilities');
    });
  });
});
