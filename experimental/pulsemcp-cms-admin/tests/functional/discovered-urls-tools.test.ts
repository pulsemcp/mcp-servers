import { describe, it, expect, vi } from 'vitest';
import { listDiscoveredUrls } from '../../shared/src/tools/list-discovered-urls.js';
import { markDiscoveredUrlProcessed } from '../../shared/src/tools/mark-discovered-url-processed.js';
import { getDiscoveredUrlStats } from '../../shared/src/tools/get-discovered-url-stats.js';
import { parseEnabledToolGroups, createRegisterTools } from '../../shared/src/tools.js';
import type { IPulseMCPAdminClient } from '../../shared/src/index.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

function createMockClient(overrides?: Partial<IPulseMCPAdminClient>): IPulseMCPAdminClient {
  return {
    getPosts: vi.fn(),
    getPost: vi.fn(),
    createPost: vi.fn(),
    updatePost: vi.fn(),
    uploadImage: vi.fn(),
    getAuthors: vi.fn(),
    getAuthorBySlug: vi.fn(),
    getAuthorById: vi.fn(),
    getMCPServerBySlug: vi.fn(),
    getMCPServerById: vi.fn(),
    getMCPClientBySlug: vi.fn(),
    getMCPClientById: vi.fn(),
    getMCPImplementationById: vi.fn(),
    searchMCPImplementations: vi.fn(),
    getDraftMCPImplementations: vi.fn(),
    saveMCPImplementation: vi.fn(),
    createMCPImplementation: vi.fn(),
    sendEmail: vi.fn(),
    searchProviders: vi.fn(),
    getProviderById: vi.fn(),
    getOfficialMirrorQueueItems: vi.fn(),
    getOfficialMirrorQueueItem: vi.fn(),
    approveOfficialMirrorQueueItem: vi.fn(),
    approveOfficialMirrorQueueItemWithoutModifying: vi.fn(),
    rejectOfficialMirrorQueueItem: vi.fn(),
    addOfficialMirrorToRegularQueue: vi.fn(),
    unlinkOfficialMirrorQueueItem: vi.fn(),
    getUnofficialMirrors: vi.fn(),
    getUnofficialMirror: vi.fn(),
    createUnofficialMirror: vi.fn(),
    updateUnofficialMirror: vi.fn(),
    deleteUnofficialMirror: vi.fn(),
    getOfficialMirrors: vi.fn(),
    getOfficialMirror: vi.fn(),
    getTenants: vi.fn(),
    getTenant: vi.fn(),
    getMcpJsons: vi.fn(),
    getMcpJson: vi.fn(),
    createMcpJson: vi.fn(),
    updateMcpJson: vi.fn(),
    deleteMcpJson: vi.fn(),
    getUnifiedMCPServers: vi.fn(),
    getUnifiedMCPServer: vi.fn(),
    updateUnifiedMCPServer: vi.fn(),
    getRedirects: vi.fn(),
    getRedirect: vi.fn(),
    createRedirect: vi.fn(),
    updateRedirect: vi.fn(),
    deleteRedirect: vi.fn(),
    getGoodJobs: vi.fn(),
    getGoodJob: vi.fn(),
    getGoodJobCronSchedules: vi.fn(),
    getGoodJobProcesses: vi.fn(),
    getGoodJobStatistics: vi.fn(),
    retryGoodJob: vi.fn(),
    discardGoodJob: vi.fn(),
    rescheduleGoodJob: vi.fn(),
    forceTriggerGoodJobCron: vi.fn(),
    cleanupGoodJobs: vi.fn(),
    runExamForMirror: vi.fn(),
    saveResultsForMirror: vi.fn(),
    getProctorRuns: vi.fn(),
    getDiscoveredUrls: vi.fn(),
    markDiscoveredUrlProcessed: vi.fn(),
    getDiscoveredUrlStats: vi.fn(),
    ...overrides,
  };
}

describe('Discovered URLs Tools', () => {
  const mockServer = {} as Server;

  describe('list_discovered_urls', () => {
    it('should fetch and format discovered URLs with defaults', async () => {
      const mockClient = createMockClient({
        getDiscoveredUrls: vi.fn().mockResolvedValue({
          urls: [
            {
              id: 12345,
              url: 'https://github.com/acme/acme-mcp-server',
              source: 'github_scraper',
              created_at: '2026-02-24T08:30:00Z',
              metadata: {},
            },
            {
              id: 12346,
              url: 'https://github.com/example/example-mcp',
              source: 'manual',
              created_at: '2026-02-24T09:00:00Z',
              metadata: { tags: ['ai'] },
            },
          ],
          has_more: true,
          total_count: 1042,
          page: 1,
          per_page: 50,
        }),
      });

      const tool = listDiscoveredUrls(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Found 2 discovered URLs');
      expect(result.content[0].text).toContain('total: 1042');
      expect(result.content[0].text).toContain('has_more: true');
      expect(result.content[0].text).toContain('https://github.com/acme/acme-mcp-server');
      expect(result.content[0].text).toContain('ID: 12345');
      expect(result.content[0].text).toContain('github_scraper');
      expect(result.content[0].text).toContain('Metadata:');
    });

    it('should pass filter parameters to client', async () => {
      const getDiscoveredUrlsMock = vi.fn().mockResolvedValue({
        urls: [],
        has_more: false,
        total_count: 0,
        page: 2,
        per_page: 25,
      });

      const mockClient = createMockClient({
        getDiscoveredUrls: getDiscoveredUrlsMock,
      });

      const tool = listDiscoveredUrls(mockServer, () => mockClient);
      await tool.handler({ status: 'processed', page: 2, per_page: 25 });

      expect(getDiscoveredUrlsMock).toHaveBeenCalledWith({
        status: 'processed',
        page: 2,
        per_page: 25,
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = createMockClient({
        getDiscoveredUrls: vi.fn().mockRejectedValue(new Error('Invalid API key')),
      });

      const tool = listDiscoveredUrls(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching discovered URLs');
      expect(result.content[0].text).toContain('Invalid API key');
    });

    it('should have correct tool metadata', () => {
      const mockClient = createMockClient();
      const tool = listDiscoveredUrls(mockServer, () => mockClient);

      expect(tool.name).toBe('list_discovered_urls');
      expect(tool.description).toContain('List discovered URLs');
      expect(tool.inputSchema.properties).toHaveProperty('status');
      expect(tool.inputSchema.properties).toHaveProperty('page');
      expect(tool.inputSchema.properties).toHaveProperty('per_page');
    });
  });

  describe('mark_discovered_url_processed', () => {
    it('should mark a URL as posted with implementation ID', async () => {
      const mockClient = createMockClient({
        markDiscoveredUrlProcessed: vi.fn().mockResolvedValue({
          success: true,
          id: 12345,
          processed_at: '2026-02-25T06:15:00Z',
        }),
      });

      const tool = markDiscoveredUrlProcessed(mockServer, () => mockClient);
      const result = await tool.handler({
        id: 12345,
        result: 'posted',
        mcp_implementation_id: 5678,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Successfully marked discovered URL (ID: 12345)');
      expect(result.content[0].text).toContain('2026-02-25T06:15:00Z');
      expect(result.content[0].text).toContain('posted');
      expect(result.content[0].text).toContain('MCP Implementation ID:** 5678');
    });

    it('should mark a URL as skipped with notes', async () => {
      const markMock = vi.fn().mockResolvedValue({
        success: true,
        id: 12345,
        processed_at: '2026-02-25T06:15:00Z',
      });

      const mockClient = createMockClient({
        markDiscoveredUrlProcessed: markMock,
      });

      const tool = markDiscoveredUrlProcessed(mockServer, () => mockClient);
      const result = await tool.handler({
        id: 12345,
        result: 'skipped',
        notes: 'Not an MCP server',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('skipped');
      expect(result.content[0].text).toContain('Not an MCP server');
      expect(markMock).toHaveBeenCalledWith({
        id: 12345,
        result: 'skipped',
        notes: 'Not an MCP server',
        mcp_implementation_id: undefined,
      });
    });

    it('should handle 404 errors', async () => {
      const mockClient = createMockClient({
        markDiscoveredUrlProcessed: vi
          .fn()
          .mockRejectedValue(new Error('Discovered URL with ID 99999 not found')),
      });

      const tool = markDiscoveredUrlProcessed(mockServer, () => mockClient);
      const result = await tool.handler({ id: 99999, result: 'skipped' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error marking discovered URL as processed');
      expect(result.content[0].text).toContain('not found');
    });

    it('should have correct tool metadata with required fields', () => {
      const mockClient = createMockClient();
      const tool = markDiscoveredUrlProcessed(mockServer, () => mockClient);

      expect(tool.name).toBe('mark_discovered_url_processed');
      expect(tool.inputSchema.required).toContain('id');
      expect(tool.inputSchema.required).toContain('result');
      expect(tool.inputSchema.properties).toHaveProperty('notes');
      expect(tool.inputSchema.properties).toHaveProperty('mcp_implementation_id');
    });
  });

  describe('get_discovered_url_stats', () => {
    it('should fetch and format stats', async () => {
      const mockClient = createMockClient({
        getDiscoveredUrlStats: vi.fn().mockResolvedValue({
          pending: 1042,
          processed_today: 387,
          posted_today: 42,
          skipped_today: 330,
          rejected_today: 12,
          errored_today: 3,
        }),
      });

      const tool = getDiscoveredUrlStats(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Discovered URL Statistics');
      expect(result.content[0].text).toContain('Pending:** 1042');
      expect(result.content[0].text).toContain('Processed Today:** 387');
      expect(result.content[0].text).toContain('Posted Today:** 42');
      expect(result.content[0].text).toContain('Skipped Today:** 330');
      expect(result.content[0].text).toContain('Rejected Today:** 12');
      expect(result.content[0].text).toContain('Errored Today:** 3');
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = createMockClient({
        getDiscoveredUrlStats: vi.fn().mockRejectedValue(new Error('Server error')),
      });

      const tool = getDiscoveredUrlStats(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching discovered URL stats');
    });

    it('should have correct tool metadata with no required params', () => {
      const mockClient = createMockClient();
      const tool = getDiscoveredUrlStats(mockServer, () => mockClient);

      expect(tool.name).toBe('get_discovered_url_stats');
      expect(tool.description).toContain('summary statistics');
      expect(tool.inputSchema.properties).toEqual({});
    });
  });

  describe('parseEnabledToolGroups with discovered_urls', () => {
    it('should parse discovered_urls group', () => {
      const groups = parseEnabledToolGroups('discovered_urls');
      expect(groups).toContain('discovered_urls');
      expect(groups).toHaveLength(1);
    });

    it('should parse discovered_urls_readonly group', () => {
      const groups = parseEnabledToolGroups('discovered_urls_readonly');
      expect(groups).toContain('discovered_urls_readonly');
      expect(groups).toHaveLength(1);
    });

    it('should include discovered_urls in default groups', () => {
      const groups = parseEnabledToolGroups();
      expect(groups).toContain('discovered_urls');
    });
  });

  describe('tool group filtering for discovered_urls', () => {
    it('should register all 3 discovered_urls tools when group is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const registerTools = createRegisterTools(() => createMockClient(), 'discovered_urls');
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(3);
      const names = result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('list_discovered_urls');
      expect(names).toContain('mark_discovered_url_processed');
      expect(names).toContain('get_discovered_url_stats');
    });

    it('should register only read tools when discovered_urls_readonly is enabled', async () => {
      const mockServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const registerTools = createRegisterTools(
        () => createMockClient(),
        'discovered_urls_readonly'
      );
      registerTools(mockServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (mockServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(2);
      const names = result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('list_discovered_urls');
      expect(names).toContain('get_discovered_url_stats');
      expect(names).not.toContain('mark_discovered_url_processed');
    });
  });
});
