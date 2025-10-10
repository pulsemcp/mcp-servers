import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/src/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('claude-code-agent MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list tools', async () => {
      client = await createTestMCPClient();

      // TestMCPClient doesn't have getServerInfo() - we test tool listing instead
      const tools = await client.listTools();
      expect(tools.tools).toBeDefined();
      expect(tools.tools.length).toBeGreaterThan(0);
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      client = await createTestMCPClient();

      const result = await client.listTools();
      expect(result.tools).toHaveLength(7);

      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('init_agent');
      expect(toolNames).toContain('find_servers');
      expect(toolNames).toContain('install_servers');
      expect(toolNames).toContain('chat');
      expect(toolNames).toContain('inspect_transcript');
      expect(toolNames).toContain('stop_agent');
      expect(toolNames).toContain('get_server_capabilities');
    });

    it('should initialize an agent', async () => {
      client = await createTestMCPClient();

      const result = await client.callTool('init_agent', {
        system_prompt: 'You are a helpful assistant',
        working_directory: '/tmp/test-integration',
      });

      expect(result.content[0].text).toContain('sessionId');
      expect(result.content[0].text).toContain('idle');
      expect(result.content[0].text).toContain('stateUri');
    });

    it('should find servers based on task', async () => {
      client = await createTestMCPClient();

      const result = await client.callTool('find_servers', {
        task_prompt: 'I need to query a database and monitor logs',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.servers).toBeDefined();
      expect(response.servers.length).toBeGreaterThan(0);

      // Should include database and monitoring servers
      const serverNames = response.servers.map((s: { name: string }) => s.name);
      expect(serverNames).toContain('io.github.crystaldba/postgres');
      expect(serverNames).toContain('com.pulsemcp/appsignal');
    });

    it('should handle chat workflow', async () => {
      client = await createTestMCPClient();

      // Initialize agent
      const initResult = await client.callTool('init_agent', {
        system_prompt: 'You are a test assistant',
        working_directory: '/tmp/test-integration',
      });

      // Verify init succeeded
      expect(initResult.isError).toBeFalsy();

      // Install servers
      const installResult = await client.callTool('install_servers', {
        server_names: ['com.pulsemcp/fetch'],
      });

      // Verify install didn't error
      expect(installResult.isError).toBeFalsy();
      const installResponse = JSON.parse(installResult.content[0].text);
      expect(installResponse.installations[0].status).toBe('success');

      // Chat with agent
      const chatResult = await client.callTool('chat', {
        prompt: 'Hello, test assistant!',
      });

      const chatResponse = JSON.parse(chatResult.content[0].text);
      expect(chatResponse.response).toBe('Mock response to: Hello, test assistant!');
      expect(chatResponse.metadata.tokensUsed).toBe(100);
    });

    it('should inspect transcript', async () => {
      client = await createTestMCPClient();

      // Initialize agent first
      const initResult = await client.callTool('init_agent', {
        system_prompt: 'Test',
        working_directory: '/tmp/test-integration',
      });

      // Verify init succeeded
      expect(initResult.isError).toBeFalsy();

      // Then chat
      const chatResult = await client.callTool('chat', {
        prompt: 'Test message',
      });

      // Verify chat succeeded
      expect(chatResult.isError).toBeFalsy();

      // Inspect transcript
      const result = await client.callTool('inspect_transcript', {
        format: 'json',
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.transcriptUri).toContain('transcript.json');
      expect(response.metadata.messageCount).toBe(2);
    });

    it('should stop agent', async () => {
      client = await createTestMCPClient();

      // Initialize first
      const initResult = await client.callTool('init_agent', {
        system_prompt: 'Test',
        working_directory: '/tmp/test-integration',
      });

      // Verify init succeeded
      expect(initResult.isError).toBeFalsy();

      // Stop agent
      const result = await client.callTool('stop_agent', {});

      const response = JSON.parse(result.content[0].text);
      expect(response.status).toBe('stopped');
      expect(response.finalState.systemPrompt).toBe('Test');
    });

    it('should get server capabilities', async () => {
      client = await createTestMCPClient();

      // Create a mock servers.json
      const mockServers = [
        {
          name: 'com.postgres/mcp',
          description: 'PostgreSQL integration',
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
      ];

      await fs.writeFile('/tmp/test-servers.json', JSON.stringify(mockServers));

      // Need to recreate client with the path
      await client.disconnect();
      client = await createTestMCPClient({
        SERVER_CONFIGS_PATH: '/tmp/test-servers.json',
      });

      const result = await client.callTool('get_server_capabilities', {
        server_names: ['com.postgres/mcp'],
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.servers).toHaveLength(1);
      expect(response.servers[0].name).toBe('com.postgres/mcp');
      expect(response.servers[0].capabilities).toBeDefined();
    });

    it('should validate input schemas', async () => {
      client = await createTestMCPClient();

      // Try calling init_agent without required field - should throw McpError
      await expect(client.callTool('init_agent', {})).rejects.toThrow();
    });
  });

  describe('Resources', () => {
    it('should list no resources when no agent is initialized', async () => {
      client = await createTestMCPClient();

      const result = await client.listResources();
      expect(result.resources).toHaveLength(0);
    });

    it('should list resources after agent initialization', async () => {
      client = await createTestMCPClient();

      // Initialize agent first
      const initResult = await client.callTool('init_agent', {
        system_prompt: 'Test agent',
        working_directory: '/tmp/test-integration',
      });

      // Verify init succeeded
      expect(initResult.isError).toBeFalsy();

      const result = await client.listResources();
      expect(result.resources).toHaveLength(1);

      const resourceUris = result.resources.map((r) => r.uri);
      expect(resourceUris.some((uri) => uri.includes('state.json'))).toBe(true);
    });

    it('should read state resource', async () => {
      client = await createTestMCPClient();

      // Initialize agent
      const initResult = await client.callTool('init_agent', {
        system_prompt: 'Test agent for resources',
        working_directory: '/tmp/test-integration',
      });

      // Verify init succeeded
      expect(initResult.isError).toBeFalsy();

      // Get resources to find state URI
      const result = await client.listResources();
      const stateResource = result.resources.find((r) => r.name === 'Subagent State');
      expect(stateResource).toBeDefined();

      // We can't easily mock fs in integration tests, so we'll just check that
      // the resource URI is valid
      expect(stateResource!.uri).toMatch(/^file:\/\/.*state\.json$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required parameters', async () => {
      client = await createTestMCPClient();

      // MCP SDK throws McpError when server throws
      await expect(client.callTool('find_servers', {})).rejects.toThrow('task_prompt');
    });

    it('should handle operations on uninitialized agent', async () => {
      client = await createTestMCPClient();

      // MCP SDK throws McpError when server throws
      await expect(
        client.callTool('install_servers', {
          server_names: ['com.postgres/mcp'],
        })
      ).rejects.toThrow('No agent initialized');
    });
  });
});

/**
 * Helper function to create a TestMCPClient
 */
async function createTestMCPClient(env: Record<string, string> = {}): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      // Set a default configs path for tests
      SERVER_CONFIGS_PATH: env.SERVER_CONFIGS_PATH || '/tmp/test-servers.json',
      ...env,
    },
    debug: false,
  });

  await client.connect();
  return client;
}
