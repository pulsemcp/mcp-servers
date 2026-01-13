import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../test-mcp-client/build/index.js';
import {
  createIntegrationMockFlyIOClient,
  type MockData,
} from '../../shared/src/fly-io-client/fly-io-client.integration-mock.js';
import type { IFlyIOClient } from '../../shared/src/fly-io-client/fly-io-client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Fly.io MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list capabilities', async () => {
      const mockFlyIOClient = createIntegrationMockFlyIOClient({});
      client = await createTestMCPClientWithMock(mockFlyIOClient);

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('fly-io-mcp-server');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      const mockFlyIOClient = createIntegrationMockFlyIOClient({});
      client = await createTestMCPClientWithMock(mockFlyIOClient);

      const tools = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('list_apps');
      expect(toolNames).toContain('get_app');
      expect(toolNames).toContain('create_app');
      expect(toolNames).toContain('delete_app');
      expect(toolNames).toContain('list_machines');
      expect(toolNames).toContain('get_machine');
      expect(toolNames).toContain('create_machine');
      expect(toolNames).toContain('update_machine');
      expect(toolNames).toContain('delete_machine');
      expect(toolNames).toContain('start_machine');
      expect(toolNames).toContain('stop_machine');
    });

    it('should list apps', async () => {
      const mockFlyIOClient = createIntegrationMockFlyIOClient({
        apps: [
          {
            id: 'app-1',
            name: 'my-test-app',
            status: 'deployed',
            organization: { name: 'Test Org', slug: 'test-org' },
            machine_count: 2,
          },
        ],
      });

      client = await createTestMCPClientWithMock(mockFlyIOClient);

      const result = await client.callTool('list_apps', {});
      expect(result.content[0].text).toContain('my-test-app');
      expect(result.content[0].text).toContain('deployed');
    });

    it('should create and manage machines', async () => {
      const mockFlyIOClient = createIntegrationMockFlyIOClient({
        apps: [
          {
            id: 'app-1',
            name: 'my-app',
            status: 'deployed',
            organization: { name: 'Test Org', slug: 'test-org' },
            machine_count: 0,
          },
        ],
      });

      client = await createTestMCPClientWithMock(mockFlyIOClient);

      // Create a machine
      const createResult = await client.callTool('create_machine', {
        app_name: 'my-app',
        image: 'nginx:latest',
        name: 'web-server',
      });
      expect(createResult.content[0].text).toContain('Successfully created');
      expect(createResult.content[0].text).toContain('web-server');

      // List machines
      const listResult = await client.callTool('list_machines', {
        app_name: 'my-app',
      });
      expect(listResult.content[0].text).toContain('web-server');
      expect(listResult.content[0].text).toContain('nginx:latest');
    });

    it('should handle errors gracefully', async () => {
      const mockFlyIOClient = createIntegrationMockFlyIOClient({});
      client = await createTestMCPClientWithMock(mockFlyIOClient);

      // Try to get a non-existent app
      const result = await client.callTool('get_app', {
        app_name: 'non-existent-app',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked Fly.io client.
 */
async function createTestMCPClientWithMock(
  mockFlyIOClient: IFlyIOClient & { mockData?: MockData }
): Promise<TestMCPClient> {
  const mockData = mockFlyIOClient.mockData || {};

  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      FLY_IO_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
