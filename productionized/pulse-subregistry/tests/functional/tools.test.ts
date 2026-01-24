import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IPulseSubregistryClient, ClientFactory } from '../../shared/src/client.js';
import { listServersTool } from '../../shared/src/tools/list-servers.js';
import { getServerTool } from '../../shared/src/tools/get-server.js';

// Create mock client factory
function createMockClient(): IPulseSubregistryClient {
  return {
    listServers: vi.fn(),
    getServer: vi.fn(),
  };
}

describe('list_servers tool', () => {
  let mockClient: IPulseSubregistryClient;
  let mockServer: Server;
  let clientFactory: ClientFactory;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = {} as Server;
    clientFactory = () => mockClient;
  });

  it('should return JSON list of servers with _meta', async () => {
    (mockClient.listServers as ReturnType<typeof vi.fn>).mockResolvedValue({
      servers: [
        {
          server: {
            name: 'io.github.example/test-server-1',
            title: 'Test Server 1',
            description: 'A test server',
            version: '1.0.0',
            websiteUrl: 'https://example.com/test-1',
          },
          _meta: { 'com.pulsemcp/server': { visitorsEstimateTotal: 100 } },
        },
        {
          server: {
            name: 'io.github.example/test-server-2',
            title: 'Test Server 2',
            description: 'Another test server',
            version: '2.0.0',
            repository: { url: 'https://github.com/example/test-2', source: 'github' },
          },
          _meta: { 'com.pulsemcp/server': { visitorsEstimateTotal: 200 } },
        },
      ],
      metadata: {
        count: 2,
      },
    });

    const tool = listServersTool(mockServer, clientFactory);
    const result = await tool.handler({});

    // Verify it's valid JSON with full structure including _meta
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.servers).toHaveLength(2);
    expect(parsed.servers[0].server.name).toBe('io.github.example/test-server-1');
    expect(parsed.servers[0].server.title).toBe('Test Server 1');
    expect(parsed.servers[0]._meta['com.pulsemcp/server'].visitorsEstimateTotal).toBe(100);
    expect(parsed.servers[1].server.name).toBe('io.github.example/test-server-2');
    expect(parsed.servers[1]._meta['com.pulsemcp/server'].visitorsEstimateTotal).toBe(200);
    expect(parsed.metadata.count).toBe(2);
  });

  it('should pass limit parameter to client', async () => {
    (mockClient.listServers as ReturnType<typeof vi.fn>).mockResolvedValue({
      servers: [],
      metadata: { count: 0 },
    });

    const tool = listServersTool(mockServer, clientFactory);
    await tool.handler({ limit: 10 });

    expect(mockClient.listServers).toHaveBeenCalledWith(expect.objectContaining({ limit: 10 }));
  });

  it('should pass search parameter to client', async () => {
    (mockClient.listServers as ReturnType<typeof vi.fn>).mockResolvedValue({
      servers: [],
      metadata: { count: 0 },
    });

    const tool = listServersTool(mockServer, clientFactory);
    await tool.handler({ search: 'github' });

    expect(mockClient.listServers).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'github' })
    );
  });

  it('should pass cursor parameter to client', async () => {
    (mockClient.listServers as ReturnType<typeof vi.fn>).mockResolvedValue({
      servers: [],
      metadata: { count: 0 },
    });

    const tool = listServersTool(mockServer, clientFactory);
    await tool.handler({ cursor: 'abc123' });

    expect(mockClient.listServers).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: 'abc123' })
    );
  });

  it('should include nextCursor in JSON when available', async () => {
    (mockClient.listServers as ReturnType<typeof vi.fn>).mockResolvedValue({
      servers: [{ server: { name: 'test-server', description: 'Test' }, _meta: {} }],
      metadata: { count: 1, nextCursor: 'next-page-cursor' },
    });

    const tool = listServersTool(mockServer, clientFactory);
    const result = await tool.handler({});

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.metadata.nextCursor).toBe('next-page-cursor');
  });

  it('should handle errors gracefully', async () => {
    (mockClient.listServers as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('API request failed')
    );

    const tool = listServersTool(mockServer, clientFactory);
    const result = await tool.handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error listing servers');
    expect(result.content[0].text).toContain('API request failed');
  });

  it('should use default limit of 30', async () => {
    (mockClient.listServers as ReturnType<typeof vi.fn>).mockResolvedValue({
      servers: [],
      metadata: { count: 0 },
    });

    const tool = listServersTool(mockServer, clientFactory);
    await tool.handler({});

    expect(mockClient.listServers).toHaveBeenCalledWith(expect.objectContaining({ limit: 30 }));
  });
});

describe('get_server tool', () => {
  let mockClient: IPulseSubregistryClient;
  let mockServer: Server;
  let clientFactory: ClientFactory;

  beforeEach(() => {
    mockClient = createMockClient();
    mockServer = {} as Server;
    clientFactory = () => mockClient;
  });

  it('should return JSON server details', async () => {
    (mockClient.getServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      server: {
        name: 'io.github.example/test-server',
        title: 'Test Server',
        description: 'A detailed test server',
        version: '1.2.3',
        websiteUrl: 'https://example.com/test',
        repository: { url: 'https://github.com/example/test', source: 'github' },
      },
      _meta: {},
    });

    const tool = getServerTool(mockServer, clientFactory);
    const result = await tool.handler({ server_name: 'io.github.example/test-server' });

    // Verify it's valid JSON
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.server.name).toBe('io.github.example/test-server');
    expect(parsed.server.title).toBe('Test Server');
    expect(parsed.server.description).toBe('A detailed test server');
    expect(parsed.server.version).toBe('1.2.3');
    expect(parsed.server.websiteUrl).toBe('https://example.com/test');
    expect(parsed.server.repository.url).toBe('https://github.com/example/test');
    expect(parsed._meta).toEqual({});
  });

  it('should pass server name and version to client', async () => {
    (mockClient.getServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      server: { name: 'test-server' },
      _meta: {},
    });

    const tool = getServerTool(mockServer, clientFactory);
    await tool.handler({ server_name: 'test-server', version: '2.0.0' });

    expect(mockClient.getServer).toHaveBeenCalledWith({
      serverName: 'test-server',
      version: '2.0.0',
    });
  });

  it('should use latest version by default', async () => {
    (mockClient.getServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      server: { name: 'test-server' },
      _meta: {},
    });

    const tool = getServerTool(mockServer, clientFactory);
    await tool.handler({ server_name: 'test-server' });

    expect(mockClient.getServer).toHaveBeenCalledWith({
      serverName: 'test-server',
      version: 'latest',
    });
  });

  it('should handle server not found error', async () => {
    (mockClient.getServer as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Server not found: unknown-server')
    );

    const tool = getServerTool(mockServer, clientFactory);
    const result = await tool.handler({ server_name: 'unknown-server' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error getting server details');
    expect(result.content[0].text).toContain('Server not found');
  });

  it('should require server_name parameter', async () => {
    const tool = getServerTool(mockServer, clientFactory);
    const result = await tool.handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });

  it('should include all fields from server response in JSON', async () => {
    (mockClient.getServer as ReturnType<typeof vi.fn>).mockResolvedValue({
      server: {
        name: 'test-server',
        description: 'Test',
        customField: 'custom value',
        anotherField: 123,
      },
      _meta: { someMetadata: 'value' },
    });

    const tool = getServerTool(mockServer, clientFactory);
    const result = await tool.handler({ server_name: 'test-server' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.server.customField).toBe('custom value');
    expect(parsed.server.anotherField).toBe(123);
    expect(parsed._meta.someMetadata).toBe('value');
  });
});
