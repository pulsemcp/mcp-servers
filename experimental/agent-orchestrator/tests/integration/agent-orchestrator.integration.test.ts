import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { createIntegrationMockOrchestratorClient } from '../../shared/src/orchestrator-client/orchestrator-client.integration-mock.js';
import type { IAgentOrchestratorClient } from '../../shared/src/orchestrator-client/orchestrator-client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Agent Orchestrator MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list tools', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({});
      client = await createTestMCPClientWithMock(mockClient);

      // Server is initialized if we can list tools
      const result = await client.listTools();
      expect(result).toBeDefined();
      expect(result.tools).toBeDefined();
    });
  });

  describe('Tools', () => {
    it('should list available tools (simplified 4-tool API)', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.listTools();
      const tools = result.tools;
      expect(tools.length).toBe(4);

      const toolNames = tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('search_sessions');
      expect(toolNames).toContain('get_session');
      expect(toolNames).toContain('start_session');
      expect(toolNames).toContain('action_session');
    });

    it('should execute search_sessions tool', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({
        sessions: [
          {
            id: 1,
            slug: 'test-session',
            title: 'Test Session',
            status: 'running',
            agent_type: 'claude_code',
            prompt: 'Test prompt',
            git_root: 'https://github.com/test/repo.git',
            branch: 'main',
            subdirectory: null,
            execution_provider: 'local_filesystem',
            stop_condition: null,
            mcp_servers: [],
            config: {},
            metadata: {},
            custom_metadata: {},
            session_id: null,
            job_id: null,
            running_job_id: null,
            archived_at: null,
            created_at: '2025-01-15T14:30:00Z',
            updated_at: '2025-01-15T14:35:00Z',
          },
        ],
      });
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('search_sessions', {});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Session');
      expect(result.content[0].text).toContain('running');
    });

    it('should execute get_session tool', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({
        sessions: [
          {
            id: 1,
            slug: 'test-session',
            title: 'Test Session Details',
            status: 'needs_input',
            agent_type: 'claude_code',
            prompt: 'Detailed test prompt',
            git_root: 'https://github.com/test/repo.git',
            branch: 'feature',
            subdirectory: 'src',
            execution_provider: 'local_filesystem',
            stop_condition: 'PR merged',
            mcp_servers: ['github'],
            config: {},
            metadata: { clone_path: '/tmp/test' },
            custom_metadata: { ticket: 'PROJ-123' },
            session_id: 'sess_abc123',
            job_id: 'job_123',
            running_job_id: null,
            archived_at: null,
            created_at: '2025-01-15T14:30:00Z',
            updated_at: '2025-01-15T14:35:00Z',
          },
        ],
      });
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('get_session', { id: 1 });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Session Details');
      expect(result.content[0].text).toContain('needs_input');
      expect(result.content[0].text).toContain('feature');
    });

    it('should execute start_session tool', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('start_session', {
        title: 'New Test Session',
        prompt: 'Create a test file',
        git_root: 'https://github.com/test/repo.git',
        branch: 'main',
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Session Started Successfully');
      expect(result.content[0].text).toContain('New Test Session');
    });

    it('should execute get_session tool with logs', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({
        sessions: [
          {
            id: 1,
            slug: null,
            title: 'Test',
            status: 'running',
            agent_type: 'claude_code',
            prompt: null,
            git_root: null,
            branch: null,
            subdirectory: null,
            execution_provider: 'local_filesystem',
            stop_condition: null,
            mcp_servers: [],
            config: {},
            metadata: {},
            custom_metadata: {},
            session_id: null,
            job_id: null,
            running_job_id: null,
            archived_at: null,
            created_at: '2025-01-15T14:30:00Z',
            updated_at: '2025-01-15T14:35:00Z',
          },
        ],
        logs: [
          {
            id: 1,
            session_id: 1,
            content: 'Agent started processing',
            level: 'info',
            created_at: '2025-01-15T14:30:00Z',
            updated_at: '2025-01-15T14:30:00Z',
          },
          {
            id: 2,
            session_id: 1,
            content: 'Found an error',
            level: 'error',
            created_at: '2025-01-15T14:31:00Z',
            updated_at: '2025-01-15T14:31:00Z',
          },
        ],
      });
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('get_session', { id: 1, include_logs: true });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Agent started processing');
      expect(result.content[0].text).toContain('Found an error');
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.listResources();
      const resources = result.resources;
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('agent-orchestrator://config');
    });

    it('should read config resource', async () => {
      const mockClient = createIntegrationMockOrchestratorClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.readResource('agent-orchestrator://config');
      expect(result.contents[0]).toMatchObject({
        uri: 'agent-orchestrator://config',
        mimeType: 'application/json',
      });

      const config = JSON.parse(result.contents[0].text);
      expect(config.server.name).toBe('agent-orchestrator-mcp-server');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked orchestrator client.
 */
async function createTestMCPClientWithMock(
  mockOrchestratorClient: IAgentOrchestratorClient & { mockData?: unknown }
): Promise<TestMCPClient> {
  const mockData = mockOrchestratorClient.mockData || {};

  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      ORCHESTRATOR_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
