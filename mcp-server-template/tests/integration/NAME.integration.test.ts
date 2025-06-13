import { describe, it, expect, afterEach } from 'vitest';
import { createMockedClient } from './integration-test-helper.js';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';

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
      client = await createMockedClient({});

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('mcp-server-NAME');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      client = await createMockedClient({});

      const tools = await client.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('example_tool');
    });

    it('should execute example_tool', async () => {
      client = await createMockedClient({});

      const result = await client.callTool('example_tool', {
        message: 'Hello, World!',
      });

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
      client = await createMockedClient({});

      const resources = await client.listResources();
      expect(resources).toHaveLength(1);
      expect(resources[0].uri).toBe('example://resource');
    });

    it('should read example resource', async () => {
      client = await createMockedClient({});

      const result = await client.readResource('example://resource');
      expect(result.contents[0]).toMatchObject({
        uri: 'example://resource',
        mimeType: 'text/plain',
        text: 'This is an example resource',
      });
    });
  });
});
