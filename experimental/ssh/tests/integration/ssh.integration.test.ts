import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { createIntegrationMockSSHClient } from '../../shared/src/ssh-client/ssh-client.integration-mock.js';
import type { ISSHClient } from '../../shared/src/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SSH MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list capabilities', async () => {
      const mockSSHClient = createIntegrationMockSSHClient({});
      client = await createTestMCPClientWithMock(mockSSHClient);

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('ssh-mcp-server');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      const mockSSHClient = createIntegrationMockSSHClient({});
      client = await createTestMCPClientWithMock(mockSSHClient);

      const tools = await client.listTools();
      expect(tools.length).toBeGreaterThanOrEqual(5);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('ssh_execute');
      expect(toolNames).toContain('ssh_upload');
      expect(toolNames).toContain('ssh_download');
      expect(toolNames).toContain('ssh_list_directory');
      expect(toolNames).toContain('ssh_connection_info');
    });

    it('should execute ssh_execute tool', async () => {
      const mockSSHClient = createIntegrationMockSSHClient({
        commandResponses: {
          'ls -la': {
            stdout: 'total 12\ndrwxr-xr-x  3 user user 4096 Jan  1 00:00 .\n',
            stderr: '',
            exitCode: 0,
          },
        },
      });
      client = await createTestMCPClientWithMock(mockSSHClient);

      const result = await client.callTool('ssh_execute', {
        command: 'ls -la',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });

      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.exitCode).toBe(0);
      expect(content.stdout).toContain('drwxr-xr-x');
    });

    it('should execute ssh_list_directory tool', async () => {
      const mockSSHClient = createIntegrationMockSSHClient({
        directoryListings: {
          '/home/user': [
            {
              filename: 'documents',
              isDirectory: true,
              size: 4096,
              modifyTime: new Date('2024-01-01'),
              permissions: 'drwxr-xr-x',
            },
            {
              filename: 'file.txt',
              isDirectory: false,
              size: 1024,
              modifyTime: new Date('2024-01-01'),
              permissions: '-rw-r--r--',
            },
          ],
        },
      });
      client = await createTestMCPClientWithMock(mockSSHClient);

      const result = await client.callTool('ssh_list_directory', {
        path: '/home/user',
      });

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });

      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content).toHaveLength(2);
      expect(content[0].name).toBe('documents');
      expect(content[0].type).toBe('directory');
      expect(content[1].name).toBe('file.txt');
      expect(content[1].type).toBe('file');
    });

    it('should execute ssh_connection_info tool', async () => {
      const mockSSHClient = createIntegrationMockSSHClient({});
      client = await createTestMCPClientWithMock(mockSSHClient);

      const result = await client.callTool('ssh_connection_info', {});

      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
          },
        ],
      });

      const content = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
      expect(content.host).toBeDefined();
      expect(content.username).toBeDefined();
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      const mockSSHClient = createIntegrationMockSSHClient({});
      client = await createTestMCPClientWithMock(mockSSHClient);

      const resources = await client.listResources();
      expect(resources.length).toBeGreaterThanOrEqual(1);

      const resourceUris = resources.map((r) => r.uri);
      expect(resourceUris).toContain('ssh://config');
    });

    it('should read config resource', async () => {
      const mockSSHClient = createIntegrationMockSSHClient({});
      client = await createTestMCPClientWithMock(mockSSHClient);

      const result = await client.readResource('ssh://config');
      expect(result.contents[0]).toMatchObject({
        uri: 'ssh://config',
        mimeType: 'application/json',
      });

      const config = JSON.parse(result.contents[0].text as string);
      expect(config.server.name).toBe('ssh-mcp-server');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked SSH client.
 */
async function createTestMCPClientWithMock(
  mockSSHClient: ISSHClient & { mockData?: unknown }
): Promise<TestMCPClient> {
  const mockData = (mockSSHClient as { mockData?: unknown }).mockData || {};

  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      SSH_HOST: 'test-host',
      SSH_USERNAME: 'test-user',
      SSH_MOCK_DATA: JSON.stringify(mockData),
      SKIP_HEALTH_CHECKS: 'true',
    },
    debug: false,
  });

  await client.connect();
  return client;
}
