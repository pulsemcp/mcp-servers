import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import { createIntegrationMockExampleClient } from '../../shared/src/example-client/example-client.integration-mock.js';
import type { IExampleClient } from '../../shared/src/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('NAME MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list capabilities', async () => {
      // Create a mock external client with empty data (will use defaults)
      const mockExampleClient = createIntegrationMockExampleClient({});

      // Create TestMCPClient that will use our mocked external client
      client = await createTestMCPClientWithMock(mockExampleClient);

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('mcp-server-NAME');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      // Create a mock external client
      const mockExampleClient = createIntegrationMockExampleClient({});

      // Create TestMCPClient that will use our mocked external client
      client = await createTestMCPClientWithMock(mockExampleClient);

      const tools = await client.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('example_tool');
    });

    it('should execute example_tool', async () => {
      // Create a mock external client with custom mock data
      const mockExampleClient = createIntegrationMockExampleClient({
        // Add any custom mock data here if needed
        // Example:
        // processedMessages: {
        //   'Hello, World!': 'Custom processed: Hello, World!'
        // }
      });

      // Create TestMCPClient that will use our mocked external client
      client = await createTestMCPClientWithMock(mockExampleClient);

      // Call the MCP tool
      const result = await client.callTool('example_tool', {
        message: 'Hello, World!',
      });

      // Verify the result
      expect(result).toMatchObject({
        content: [
          {
            type: 'text',
            text: 'Processed message: Hello, World!',
          },
        ],
      });
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      // Create a mock external client
      const mockExampleClient = createIntegrationMockExampleClient({});

      // Create TestMCPClient that will use our mocked external client
      client = await createTestMCPClientWithMock(mockExampleClient);

      const resources = await client.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('example://resource');
    });

    it('should read example resource', async () => {
      // Create a mock external client with custom resource data
      const mockExampleClient = createIntegrationMockExampleClient({
        // Add any custom mock data here if needed
        // Example:
        // resources: {
        //   'example://resource': 'Custom resource content'
        // }
      });

      // Create TestMCPClient that will use our mocked external client
      client = await createTestMCPClientWithMock(mockExampleClient);

      const result = await client.readResource('example://resource');
      expect(result.contents[0]).toMatchObject({
        uri: 'example://resource',
        mimeType: 'text/plain',
        text: 'This is an example resource',
      });
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked external client.
 * This demonstrates how we're mocking the external API calls, not the MCP client.
 */
async function createTestMCPClientWithMock(
  mockExampleClient: IExampleClient & { mockData?: unknown }
): Promise<TestMCPClient> {
  // We need to pass the mock to the server somehow.
  // Since we can't inject it directly, we'll use environment variables
  // to tell the server to use our mock data.
  const mockData = mockExampleClient.mockData || {};

  // Support testing against both local and published builds
  const buildType = process.env.MCP_TEST_BUILD_TYPE || 'local';
  const serverPath =
    buildType === 'published'
      ? path.join(__dirname, '../../published-build/build/index.integration-with-mock.js')
      : path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      // Pass any required environment variables here
      // YOUR_API_KEY: 'test-api-key',
      EXAMPLE_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
