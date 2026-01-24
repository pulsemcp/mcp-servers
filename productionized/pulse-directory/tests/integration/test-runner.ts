import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { existsSync } from 'fs';

interface MockConfig {
  listSuccess?: boolean;
  getSuccess?: boolean;
  serversData?: string;
  serverData?: string;
  nextCursor?: string;
  errorMessage?: string;
}

interface TestMode {
  name: string;
  serverPath: string;
  setup?: () => Promise<void>;
}

/**
 * Helper function to create a TestMCPClient with mocked responses.
 */
async function createTestMCPClientWithMocks(
  serverPath: string,
  config: MockConfig
): Promise<TestMCPClient> {
  const env: Record<string, string> = {};

  if (config.listSuccess !== undefined) {
    env.MOCK_LIST_SUCCESS = config.listSuccess.toString();
  }

  if (config.getSuccess !== undefined) {
    env.MOCK_GET_SUCCESS = config.getSuccess.toString();
  }

  if (config.serversData) {
    env.MOCK_SERVERS_DATA = config.serversData;
  }

  if (config.serverData) {
    env.MOCK_SERVER_DATA = config.serverData;
  }

  if (config.nextCursor) {
    env.MOCK_NEXT_CURSOR = config.nextCursor;
  }

  if (config.errorMessage) {
    env.MOCK_ERROR_MESSAGE = config.errorMessage;
  }

  const client = new TestMCPClient({
    serverPath,
    env,
    debug: false,
  });

  await client.connect();
  return client;
}

/**
 * Run integration tests in a specific mode (source or built)
 */
export function runIntegrationTests(mode: TestMode) {
  describe(`Pulse Directory MCP Server Integration Tests [${mode.name}]`, () => {
    let client: TestMCPClient | null = null;

    beforeAll(async () => {
      if (mode.setup) {
        await mode.setup();
      }

      // Verify the server file exists
      if (!existsSync(mode.serverPath)) {
        throw new Error(
          `Server file not found at ${mode.serverPath}. Make sure to build the project first.`
        );
      }
    }, 30000);

    afterEach(async () => {
      if (client) {
        await client.disconnect();
        client = null;
      }
    });

    describe('Tools', () => {
      it('should list available tools', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {});

        const result = await client.listTools();

        expect(result.tools).toContainEqual(expect.objectContaining({ name: 'list_servers' }));
        expect(result.tools).toContainEqual(expect.objectContaining({ name: 'get_server' }));
      });

      it('should execute list_servers tool successfully', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {
          listSuccess: true,
          serversData: JSON.stringify([
            { name: 'server-a', description: 'First server', version: '1.0.0' },
            { name: 'server-b', description: 'Second server', version: '2.0.0' },
          ]),
        });

        const result = await client.callTool('list_servers', {});

        expect(result).toMatchObject({
          content: [
            {
              type: 'text',
              text: expect.stringContaining('server-a'),
            },
          ],
        });
        expect(result.content[0].text).toContain('server-b');
        expect(result.content[0].text).toContain('Found 2 servers');
      });

      it('should execute list_servers with search parameter', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {
          listSuccess: true,
          serversData: JSON.stringify([
            { name: 'github-server', description: 'GitHub integration' },
            { name: 'slack-server', description: 'Slack integration' },
          ]),
        });

        const result = await client.callTool('list_servers', { search: 'github' });

        expect(result.content[0].text).toContain('github-server');
      });

      it('should handle list_servers pagination', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {
          listSuccess: true,
          nextCursor: 'cursor-to-next-page',
        });

        const result = await client.callTool('list_servers', { limit: 1 });

        expect(result.content[0].text).toContain('cursor-to-next-page');
        expect(result.content[0].text).toContain('More results available');
      });

      it('should execute get_server tool successfully', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {
          getSuccess: true,
          serverData: JSON.stringify({
            name: 'my-cool-server',
            description: 'A cool MCP server',
            version: '3.0.0',
            url: 'https://example.com/cool',
            repository: 'https://github.com/example/cool',
          }),
        });

        const result = await client.callTool('get_server', {
          server_name: 'my-cool-server',
        });

        expect(result.content[0].text).toContain('my-cool-server');
        expect(result.content[0].text).toContain('A cool MCP server');
        expect(result.content[0].text).toContain('3.0.0');
      });

      it('should handle get_server with specific version', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {
          getSuccess: true,
        });

        const result = await client.callTool('get_server', {
          server_name: 'test-server',
          version: '2.0.0',
        });

        expect(result.content[0].text).toContain('test-server');
        expect(result.content[0].text).toContain('2.0.0');
      });

      it('should handle list_servers failure gracefully', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {
          listSuccess: false,
          errorMessage: 'API rate limit exceeded',
        });

        const result = await client.callTool('list_servers', {});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error listing servers');
        expect(result.content[0].text).toContain('API rate limit exceeded');
      });

      it('should handle get_server failure gracefully', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {
          getSuccess: false,
          errorMessage: 'Server not found: nonexistent-server',
        });

        const result = await client.callTool('get_server', {
          server_name: 'nonexistent-server',
        });

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error getting server details');
        expect(result.content[0].text).toContain('nonexistent-server');
      });

      it('should validate required server_name parameter', async () => {
        client = await createTestMCPClientWithMocks(mode.serverPath, {});

        const result = await client.callTool('get_server', {});

        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error');
      });
    });
  });
}
