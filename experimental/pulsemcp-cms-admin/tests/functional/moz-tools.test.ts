import { describe, it, expect, vi } from 'vitest';
import { getMozMetrics } from '../../shared/src/tools/get-moz-metrics.js';
import { getMozBacklinks } from '../../shared/src/tools/get-moz-backlinks.js';
import { getMozStoredMetrics } from '../../shared/src/tools/get-moz-stored-metrics.js';
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
    getProctorMetadata: vi.fn(),
    getDiscoveredUrls: vi.fn(),
    markDiscoveredUrlProcessed: vi.fn(),
    getDiscoveredUrlStats: vi.fn(),
    getMozMetrics: vi.fn(),
    getMozBacklinks: vi.fn(),
    getMozStoredMetrics: vi.fn(),
    ...overrides,
  };
}

describe('MOZ Tools', () => {
  const mockServer = {} as Server;

  describe('get_moz_metrics', () => {
    it('should fetch and format MOZ metrics', async () => {
      const mockClient = createMockClient({
        getMozMetrics: vi.fn().mockResolvedValue({
          metrics: {
            page_authority: 88,
            domain_authority: 95,
            spam_score: 1,
            root_domains_to_page: 441855,
          },
          raw_response: { site_metrics: {} },
          processed_at: '2026-03-15T12:00:00Z',
        }),
      });

      const tool = getMozMetrics(mockServer, () => mockClient);
      const result = await tool.handler({ url: 'https://github.com' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('MOZ Metrics for https://github.com');
      expect(result.content[0].text).toContain('Page Authority:** 88');
      expect(result.content[0].text).toContain('Domain Authority:** 95');
      expect(result.content[0].text).toContain('Spam Score:** 1');
      expect(result.content[0].text).toContain('Root Domains to Page:** 441855');
      expect(result.content[0].text).toContain('2026-03-15T12:00:00Z');
    });

    it('should pass scope parameter to client', async () => {
      const getMozMetricsMock = vi.fn().mockResolvedValue({
        metrics: {},
        raw_response: {},
        processed_at: '2026-03-15T12:00:00Z',
      });

      const mockClient = createMockClient({
        getMozMetrics: getMozMetricsMock,
      });

      const tool = getMozMetrics(mockServer, () => mockClient);
      await tool.handler({ url: 'https://example.com', scope: 'domain' });

      expect(getMozMetricsMock).toHaveBeenCalledWith({
        url: 'https://example.com',
        scope: 'domain',
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = createMockClient({
        getMozMetrics: vi.fn().mockRejectedValue(new Error('MOZ API rate limit exceeded')),
      });

      const tool = getMozMetrics(mockServer, () => mockClient);
      const result = await tool.handler({ url: 'https://example.com' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching MOZ metrics');
      expect(result.content[0].text).toContain('rate limit');
    });

    it('should have correct tool metadata', () => {
      const mockClient = createMockClient();
      const tool = getMozMetrics(mockServer, () => mockClient);

      expect(tool.name).toBe('get_moz_metrics');
      expect(tool.description).toContain('MOZ API');
      expect(tool.inputSchema.properties).toHaveProperty('url');
      expect(tool.inputSchema.properties).toHaveProperty('scope');
      expect(tool.inputSchema.required).toContain('url');
    });
  });

  describe('get_moz_backlinks', () => {
    it('should fetch and format MOZ backlinks', async () => {
      const mockClient = createMockClient({
        getMozBacklinks: vi.fn().mockResolvedValue({
          backlinks: [
            {
              source_page: 'https://other.com/blog',
              anchor_text: 'example link',
              domain_authority: 72,
            },
            {
              source_page: 'https://news.com/article',
              anchor_text: 'github',
              domain_authority: 85,
            },
          ],
          raw_response: {},
          processed_at: '2026-03-15T12:00:00Z',
        }),
      });

      const tool = getMozBacklinks(mockServer, () => mockClient);
      const result = await tool.handler({ url: 'https://github.com', limit: 5 });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('MOZ Backlinks for https://github.com');
      expect(result.content[0].text).toContain('Found 2 backlink(s)');
      expect(result.content[0].text).toContain('https://other.com/blog');
      expect(result.content[0].text).toContain('example link');
      expect(result.content[0].text).toContain('Domain Authority: 72');
      expect(result.content[0].text).toContain('https://news.com/article');
    });

    it('should handle empty backlinks', async () => {
      const mockClient = createMockClient({
        getMozBacklinks: vi.fn().mockResolvedValue({
          backlinks: [],
          raw_response: {},
          processed_at: '2026-03-15T12:00:00Z',
        }),
      });

      const tool = getMozBacklinks(mockServer, () => mockClient);
      const result = await tool.handler({ url: 'https://unknown-site.com' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No backlinks found');
    });

    it('should pass scope and limit parameters to client', async () => {
      const getMozBacklinksMock = vi.fn().mockResolvedValue({
        backlinks: [],
        raw_response: {},
        processed_at: '2026-03-15T12:00:00Z',
      });

      const mockClient = createMockClient({
        getMozBacklinks: getMozBacklinksMock,
      });

      const tool = getMozBacklinks(mockServer, () => mockClient);
      await tool.handler({ url: 'https://example.com', scope: 'domain', limit: 10 });

      expect(getMozBacklinksMock).toHaveBeenCalledWith({
        url: 'https://example.com',
        scope: 'domain',
        limit: 10,
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = createMockClient({
        getMozBacklinks: vi.fn().mockRejectedValue(new Error('Invalid API key')),
      });

      const tool = getMozBacklinks(mockServer, () => mockClient);
      const result = await tool.handler({ url: 'https://example.com' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching MOZ backlinks');
      expect(result.content[0].text).toContain('Invalid API key');
    });

    it('should have correct tool metadata', () => {
      const mockClient = createMockClient();
      const tool = getMozBacklinks(mockServer, () => mockClient);

      expect(tool.name).toBe('get_moz_backlinks');
      expect(tool.description).toContain('backlink');
      expect(tool.inputSchema.properties).toHaveProperty('url');
      expect(tool.inputSchema.properties).toHaveProperty('scope');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.required).toContain('url');
    });
  });

  describe('get_moz_stored_metrics', () => {
    it('should fetch and format stored MOZ metrics', async () => {
      const mockClient = createMockClient({
        getMozStoredMetrics: vi.fn().mockResolvedValue({
          data: [
            {
              id: 123,
              canonical_id: 456,
              canonical_url: 'https://example.com/mcp',
              scope: 'url',
              timestamp: '2026-03-01T00:00:00Z',
              triggered_by: 'weekly_collection',
              page_authority: 42,
              root_domains_to_page: 100,
              site_metrics: { page_authority: 42 },
              created_at: '2026-03-01T00:05:00Z',
            },
          ],
          meta: {
            current_page: 1,
            total_pages: 1,
            total_count: 1,
            has_next: false,
            limit: 30,
          },
        }),
      });

      const tool = getMozStoredMetrics(mockServer, () => mockClient);
      const result = await tool.handler({ server_id: 'my-server' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Stored MOZ Metrics for server "my-server"');
      expect(result.content[0].text).toContain('1 total records');
      expect(result.content[0].text).toContain('https://example.com/mcp');
      expect(result.content[0].text).toContain('ID: 123');
      expect(result.content[0].text).toContain('Page Authority: 42');
      expect(result.content[0].text).toContain('Root Domains to Page: 100');
      expect(result.content[0].text).toContain('weekly_collection');
    });

    it('should handle empty results', async () => {
      const mockClient = createMockClient({
        getMozStoredMetrics: vi.fn().mockResolvedValue({
          data: [],
          meta: {
            current_page: 1,
            total_pages: 0,
            total_count: 0,
            has_next: false,
            limit: 30,
          },
        }),
      });

      const tool = getMozStoredMetrics(mockServer, () => mockClient);
      const result = await tool.handler({ server_id: 'empty-server' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('No stored MOZ data found');
    });

    it('should pass all parameters to client', async () => {
      const getMozStoredMetricsMock = vi.fn().mockResolvedValue({
        data: [],
        meta: {
          current_page: 1,
          total_pages: 0,
          total_count: 0,
          has_next: false,
          limit: 10,
        },
      });

      const mockClient = createMockClient({
        getMozStoredMetrics: getMozStoredMetricsMock,
      });

      const tool = getMozStoredMetrics(mockServer, () => mockClient);
      await tool.handler({
        server_id: 'test-server',
        canonical_id: 789,
        limit: 10,
        offset: 20,
      });

      expect(getMozStoredMetricsMock).toHaveBeenCalledWith({
        server_id: 'test-server',
        canonical_id: 789,
        limit: 10,
        offset: 20,
      });
    });

    it('should show pagination hint when more results available', async () => {
      const mockClient = createMockClient({
        getMozStoredMetrics: vi.fn().mockResolvedValue({
          data: [
            {
              id: 1,
              canonical_id: 1,
              canonical_url: 'https://example.com',
              timestamp: '2026-03-01T00:00:00Z',
              triggered_by: 'weekly_collection',
              created_at: '2026-03-01T00:05:00Z',
            },
          ],
          meta: {
            current_page: 1,
            total_pages: 3,
            total_count: 75,
            has_next: true,
            limit: 30,
          },
        }),
      });

      const tool = getMozStoredMetrics(mockServer, () => mockClient);
      const result = await tool.handler({ server_id: 'big-server' });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('More results available');
      expect(result.content[0].text).toContain('offset=30');
    });

    it('should handle API errors gracefully', async () => {
      const mockClient = createMockClient({
        getMozStoredMetrics: vi.fn().mockRejectedValue(new Error('Server not found')),
      });

      const tool = getMozStoredMetrics(mockServer, () => mockClient);
      const result = await tool.handler({ server_id: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching stored MOZ metrics');
      expect(result.content[0].text).toContain('Server not found');
    });

    it('should have correct tool metadata with required server_id', () => {
      const mockClient = createMockClient();
      const tool = getMozStoredMetrics(mockServer, () => mockClient);

      expect(tool.name).toBe('get_moz_stored_metrics');
      expect(tool.description).toContain('stored');
      expect(tool.inputSchema.properties).toHaveProperty('server_id');
      expect(tool.inputSchema.properties).toHaveProperty('canonical_id');
      expect(tool.inputSchema.properties).toHaveProperty('limit');
      expect(tool.inputSchema.properties).toHaveProperty('offset');
      expect(tool.inputSchema.required).toContain('server_id');
    });
  });

  describe('parseEnabledToolGroups with moz', () => {
    it('should parse moz group', () => {
      const groups = parseEnabledToolGroups('moz');
      expect(groups).toContain('moz');
      expect(groups).toHaveLength(1);
    });

    it('should parse moz_readonly group', () => {
      const groups = parseEnabledToolGroups('moz_readonly');
      expect(groups).toContain('moz_readonly');
      expect(groups).toHaveLength(1);
    });

    it('should include moz in default groups', () => {
      const groups = parseEnabledToolGroups();
      expect(groups).toContain('moz');
    });
  });

  describe('tool group filtering for moz', () => {
    it('should register all 3 moz tools when group is enabled', async () => {
      const testServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const registerTools = createRegisterTools(() => createMockClient(), 'moz');
      registerTools(testServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (testServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      expect(result.tools).toHaveLength(3);
      const names = result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('get_moz_metrics');
      expect(names).toContain('get_moz_backlinks');
      expect(names).toContain('get_moz_stored_metrics');
    });

    it('should register all 3 moz tools when moz_readonly is enabled (all are read-only)', async () => {
      const testServer = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const registerTools = createRegisterTools(() => createMockClient(), 'moz_readonly');
      registerTools(testServer);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (testServer as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      // All 3 moz tools are read-only, so readonly group should include all of them
      expect(result.tools).toHaveLength(3);
      const names = result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('get_moz_metrics');
      expect(names).toContain('get_moz_backlinks');
      expect(names).toContain('get_moz_stored_metrics');
    });
  });
});
