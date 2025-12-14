import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Cloud Storage MCP Server Integration Tests', () => {
  let client: TestMCPClient;

  describe('Server Lifecycle', () => {
    beforeAll(async () => {
      client = await createTestMCPClientWithMock({});
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should list available tools on connect', async () => {
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Tools', () => {
    beforeAll(async () => {
      client = await createTestMCPClientWithMock({});
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should list available tools', async () => {
      const tools = await client.listTools();
      expect(tools.tools.length).toBeGreaterThanOrEqual(4);

      const toolNames = tools.tools.map((t) => t.name);
      expect(toolNames).toContain('save_file');
      expect(toolNames).toContain('get_file');
      expect(toolNames).toContain('search_files');
      expect(toolNames).toContain('delete_file');
    });

    it('should execute save_file and get_file', async () => {
      // Save a file
      const saveResult = await client.callTool('save_file', {
        path: 'test/hello.txt',
        content: 'Hello, World!',
        content_type: 'text/plain',
      });

      expect(saveResult.isError).not.toBe(true);
      const saveResponse = JSON.parse((saveResult.content as Array<{ text: string }>)[0].text);
      expect(saveResponse.success).toBe(true);

      // Get the file back
      const getResult = await client.callTool('get_file', {
        path: 'test/hello.txt',
      });

      expect(getResult.isError).not.toBe(true);
      const getResponse = JSON.parse((getResult.content as Array<{ text: string }>)[0].text);
      expect(getResponse.success).toBe(true);
      expect(getResponse.content).toBe('Hello, World!');
    });

    it('should execute search_files', async () => {
      // First, create some files
      await client.callTool('save_file', {
        path: 'docs/readme.md',
        content: '# README',
        content_type: 'text/markdown',
      });
      await client.callTool('save_file', {
        path: 'docs/guide.md',
        content: '# Guide',
        content_type: 'text/markdown',
      });
      await client.callTool('save_file', {
        path: 'config.json',
        content: '{}',
        content_type: 'application/json',
      });

      // Search all files
      const allResult = await client.callTool('search_files', {});
      const allResponse = JSON.parse((allResult.content as Array<{ text: string }>)[0].text);
      expect(allResponse.success).toBe(true);
      expect(allResponse.files.length).toBeGreaterThanOrEqual(3);

      // Search with prefix
      const docsResult = await client.callTool('search_files', {
        prefix: 'docs/',
      });
      const docsResponse = JSON.parse((docsResult.content as Array<{ text: string }>)[0].text);
      expect(docsResponse.success).toBe(true);
      expect(docsResponse.files.length).toBe(2);
    });

    it('should execute delete_file', async () => {
      // Create a file to delete
      await client.callTool('save_file', {
        path: 'to-delete.txt',
        content: 'Delete me',
        content_type: 'text/plain',
      });

      // Delete the file
      const deleteResult = await client.callTool('delete_file', {
        path: 'to-delete.txt',
      });

      expect(deleteResult.isError).not.toBe(true);
      const deleteResponse = JSON.parse((deleteResult.content as Array<{ text: string }>)[0].text);
      expect(deleteResponse.success).toBe(true);
      expect(deleteResponse.deletedPath).toBe('to-delete.txt');

      // Verify file is gone
      const getResult = await client.callTool('get_file', {
        path: 'to-delete.txt',
      });
      expect(getResult.isError).toBe(true);
    });
  });

  describe('Resources', () => {
    beforeAll(async () => {
      client = await createTestMCPClientWithMock({
        files: {
          'file1.txt': { content: 'Content 1', contentType: 'text/plain' },
          'readme.txt': { content: 'This is a readme', contentType: 'text/plain' },
        },
      });
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should list available resources including config', async () => {
      const resources = await client.listResources();
      expect(resources.resources.length).toBeGreaterThanOrEqual(1);

      // Should have config resource
      const configResource = resources.resources.find((r) => r.uri === 'cloud-storage://config');
      expect(configResource).toBeDefined();
      expect(configResource?.name).toBe('Server Configuration');
    });

    it('should read config resource', async () => {
      const result = await client.readResource('cloud-storage://config');
      expect(result.contents[0]).toMatchObject({
        uri: 'cloud-storage://config',
        mimeType: 'application/json',
      });

      const config = JSON.parse(result.contents[0].text as string);
      expect(config.server.name).toBe('cloud-storage-mcp-server');
    });

    it('should read file resources', async () => {
      const result = await client.readResource('cloud-storage://file/readme.txt');
      expect(result.contents[0]).toMatchObject({
        uri: 'cloud-storage://file/readme.txt',
        mimeType: 'text/plain',
      });
      expect(result.contents[0].text).toBe('This is a readme');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with mock storage data
 */
async function createTestMCPClientWithMock(mockData: {
  files?: Record<
    string,
    { content: string; contentType?: string; metadata?: Record<string, string> }
  >;
}): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      STORAGE_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
