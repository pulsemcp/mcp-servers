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
      await client.disconnect();
      client = null;
    }
  });

  describe('Server Lifecycle', () => {
    it('should connect and list tools', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.listTools();
      expect(result.tools.length).toBeGreaterThan(0);
    });
  });

  describe('Tools', () => {
    it('should list available tools', async () => {
      client = await createTestMCPClientWithMock({});

      const result = await client.listTools();
      expect(result.tools.length).toBeGreaterThan(0);
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('list_buckets');
      expect(toolNames).toContain('list_objects');
      expect(toolNames).toContain('get_object');
      expect(toolNames).toContain('put_object');
    });

    it('should execute list_buckets', async () => {
      const mockData: MockS3Data = {
        buckets: [
          { name: 'test-bucket', creationDate: new Date('2024-01-01') },
          { name: 'another-bucket', creationDate: new Date('2024-02-01') },
        ],
      };

      client = await createTestMCPClientWithMock(mockData);

      const result = await client.callTool('list_buckets', {});

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.buckets).toHaveLength(2);
      expect(parsed.buckets[0].name).toBe('test-bucket');
    });

    it('should execute list_objects', async () => {
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

      const result = await client.callTool('list_objects', {
        bucket: 'test-bucket',
        prefix: 'data/',
      });

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.objects).toHaveLength(2);
    });

    it('should execute get_object', async () => {
      const mockData: MockS3Data = {
        buckets: [{ name: 'test-bucket' }],
        objects: {
          'test-bucket': {
            'config.json': { content: '{"setting": true}', contentType: 'application/json' },
          },
        },
      };

      client = await createTestMCPClientWithMock(mockData);

      const result = await client.callTool('get_object', {
        bucket: 'test-bucket',
        key: 'config.json',
      });

      const parsed = JSON.parse((result.content[0] as { text: string }).text);
      expect(parsed.content).toBe('{"setting": true}');
      expect(parsed.contentType).toBe('application/json');
    });

    it('should execute put_object', async () => {
      const mockData: MockS3Data = {
        buckets: [{ name: 'test-bucket' }],
        objects: {
          'test-bucket': {},
        },
      };

      client = await createTestMCPClientWithMock(mockData);

      const result = await client.callTool('put_object', {
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

      const result = await client.listResources();
      expect(result.resources.length).toBeGreaterThan(0);
      expect(result.resources[0].uri).toBe('s3://config');
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
async function createTestMCPClientWithMock(
  mockData: MockS3Data,
  extraEnv?: Record<string, string>
): Promise<TestMCPClient> {
  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      S3_MOCK_DATA: JSON.stringify(mockData),
      ...extraEnv,
    },
    debug: false,
  });

  await client.connect();
  return client;
}

describe('S3_BUCKET Constraint', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should hide bucket-level tools when S3_BUCKET is set', async () => {
    client = await createTestMCPClientWithMock(
      { buckets: [{ name: 'test-bucket' }] },
      { S3_BUCKET: 'test-bucket' }
    );

    const result = await client.listTools();
    const toolNames = result.tools.map((t) => t.name);

    // Bucket-level tools should be hidden
    expect(toolNames).not.toContain('list_buckets');
    expect(toolNames).not.toContain('create_bucket');
    expect(toolNames).not.toContain('delete_bucket');
    expect(toolNames).not.toContain('head_bucket');

    // Object-level tools should still be present
    expect(toolNames).toContain('list_objects');
    expect(toolNames).toContain('get_object');
    expect(toolNames).toContain('put_object');
    expect(toolNames).toContain('delete_object');
    expect(toolNames).toContain('copy_object');
  });

  it('should automatically inject bucket param when S3_BUCKET is set', async () => {
    const mockData: MockS3Data = {
      buckets: [{ name: 'constrained-bucket' }],
      objects: {
        'constrained-bucket': {
          'test-file.txt': { content: 'Hello World', contentType: 'text/plain' },
        },
      },
    };

    client = await createTestMCPClientWithMock(mockData, { S3_BUCKET: 'constrained-bucket' });

    // Call list_objects without specifying bucket - it should work
    const result = await client.callTool('list_objects', {});

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.objects).toHaveLength(1);
    expect(parsed.objects[0].key).toBe('test-file.txt');
  });

  it('should inject bucket for get_object when S3_BUCKET is set', async () => {
    const mockData: MockS3Data = {
      buckets: [{ name: 'constrained-bucket' }],
      objects: {
        'constrained-bucket': {
          'data.json': { content: '{"value": 42}', contentType: 'application/json' },
        },
      },
    };

    client = await createTestMCPClientWithMock(mockData, { S3_BUCKET: 'constrained-bucket' });

    // Call get_object without specifying bucket - it should work
    const result = await client.callTool('get_object', { key: 'data.json' });

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    expect(parsed.content).toBe('{"value": 42}');
  });

  it('should include constraint note in tool description', async () => {
    client = await createTestMCPClientWithMock({}, { S3_BUCKET: 'my-bucket' });

    const result = await client.listTools();
    const listObjectsTool = result.tools.find((t) => t.name === 'list_objects');

    expect(listObjectsTool).toBeDefined();
    expect(listObjectsTool!.description).toContain('my-bucket');
  });

  it('should remove bucket from required params in input schema', async () => {
    client = await createTestMCPClientWithMock({}, { S3_BUCKET: 'my-bucket' });

    const result = await client.listTools();
    const listObjectsTool = result.tools.find((t) => t.name === 'list_objects');

    expect(listObjectsTool).toBeDefined();
    // bucket should not be in the input schema properties
    expect(listObjectsTool!.inputSchema.properties).not.toHaveProperty('bucket');
    // bucket should not be required
    expect(listObjectsTool!.inputSchema.required || []).not.toContain('bucket');
  });
});
