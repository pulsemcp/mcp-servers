import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { type MockS3Data } from '../../shared/src/s3-client/s3-client.integration-mock.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('S3 MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list capabilities', async () => {
      client = await createTestMCPClientWithMock({});

      const serverInfo = await client.getServerInfo();
      expect(serverInfo.name).toBe('s3-mcp-server');
      expect(serverInfo.version).toBe('0.1.0');
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      client = await createTestMCPClientWithMock({});

      const tools = await client.listTools();
      expect(tools.length).toBeGreaterThan(0);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('s3_list_buckets');
      expect(toolNames).toContain('s3_list_objects');
      expect(toolNames).toContain('s3_get_object');
      expect(toolNames).toContain('s3_put_object');
    });

    it('should execute s3_list_buckets', async () => {
      const mockData: MockS3Data = {
        buckets: [
          { name: 'test-bucket', creationDate: new Date('2024-01-01') },
          { name: 'another-bucket', creationDate: new Date('2024-02-01') },
        ],
      };

      client = await createTestMCPClientWithMock(mockData);

      const result = await client.callTool('s3_list_buckets', {});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.buckets).toHaveLength(2);
      expect(parsed.buckets[0].name).toBe('test-bucket');
    });

    it('should execute s3_list_objects', async () => {
      const mockData: MockS3Data = {
        buckets: [{ name: 'test-bucket' }],
        objects: {
          'test-bucket': {
            'data/file1.json': { content: '{"key": "value1"}', contentType: 'application/json' },
            'data/file2.json': { content: '{"key": "value2"}', contentType: 'application/json' },
          },
        },
      };

      client = await createTestMCPClientWithMock(mockData);

      const result = await client.callTool('s3_list_objects', {
        bucket: 'test-bucket',
        prefix: 'data/',
      });

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.objects).toHaveLength(2);
    });

    it('should execute s3_get_object', async () => {
      const mockData: MockS3Data = {
        buckets: [{ name: 'test-bucket' }],
        objects: {
          'test-bucket': {
            'config.json': { content: '{"setting": true}', contentType: 'application/json' },
          },
        },
      };

      client = await createTestMCPClientWithMock(mockData);

      const result = await client.callTool('s3_get_object', {
        bucket: 'test-bucket',
        key: 'config.json',
      });

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.content).toBe('{"setting": true}');
      expect(parsed.contentType).toBe('application/json');
    });

    it('should execute s3_put_object', async () => {
      const mockData: MockS3Data = {
        buckets: [{ name: 'test-bucket' }],
        objects: {
          'test-bucket': {},
        },
      };

      client = await createTestMCPClientWithMock(mockData);

      const result = await client.callTool('s3_put_object', {
        bucket: 'test-bucket',
        key: 'new-file.txt',
        content: 'Hello, World!',
        contentType: 'text/plain',
      });

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.success).toBe(true);
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      client = await createTestMCPClientWithMock({});

      const resources = await client.listResources();
      expect(resources.length).toBeGreaterThan(0);
      expect(resources[0].uri).toBe('s3://config');
    });

    it('should read config resource', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.readResource('s3://config');
      expect(result.contents[0]).toMatchObject({
        uri: 's3://config',
        mimeType: 'application/json',
      });

      const config = JSON.parse(result.contents[0].text as string);
      expect(config.server.name).toBe('s3-mcp-server');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked S3 client.
 */
async function createTestMCPClientWithMock(mockData: MockS3Data): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      S3_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
