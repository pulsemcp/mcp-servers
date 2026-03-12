import { describe, it, expect, vi } from 'vitest';
import { getProctorMetadata } from '../../shared/src/tools/get-proctor-metadata.js';
import { createRegisterTools } from '../../shared/src/tools.js';
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
    ...overrides,
  };
}

describe('get_proctor_metadata', () => {
  const mockServer = {} as Server;

  it('should fetch and format proctor metadata', async () => {
    const mockClient = createMockClient({
      getProctorMetadata: vi.fn().mockResolvedValue({
        runtimes: [
          {
            id: 'v0.0.37',
            name: 'Proctor v0.0.37',
            image: 'registry.fly.io/proctor:v0.0.37',
          },
          {
            id: 'v0.0.36',
            name: 'Proctor v0.0.36',
            image: 'registry.fly.io/proctor:v0.0.36',
          },
        ],
        exams: [
          {
            id: 'proctor-mcp-client-init-tools-list',
            name: 'Init Tools List',
            description: 'Connects to the MCP server and retrieves its list of tools',
          },
          {
            id: 'proctor-mcp-client-auth-check',
            name: 'Auth Check',
            description: 'Verifies authentication configuration',
          },
        ],
      }),
    });

    const tool = getProctorMetadata(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Check runtimes section
    expect(text).toContain('## Available Proctor Runtimes');
    expect(text).toContain('**Proctor v0.0.37**');
    expect(text).toContain('id: `v0.0.37`');
    expect(text).toContain('Image: `registry.fly.io/proctor:v0.0.37`');
    expect(text).toContain('**Proctor v0.0.36**');
    expect(text).toContain('id: `v0.0.36`');

    // Check exams section
    expect(text).toContain('## Available Exams');
    expect(text).toContain('**Init Tools List**');
    expect(text).toContain('id: `proctor-mcp-client-init-tools-list`');
    expect(text).toContain('Connects to the MCP server and retrieves its list of tools');
    expect(text).toContain('**Auth Check**');
    expect(text).toContain('id: `proctor-mcp-client-auth-check`');
  });

  it('should handle empty runtimes and exams', async () => {
    const mockClient = createMockClient({
      getProctorMetadata: vi.fn().mockResolvedValue({
        runtimes: [],
        exams: [],
      }),
    });

    const tool = getProctorMetadata(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;
    expect(text).toContain('## Available Proctor Runtimes');
    expect(text).toContain('## Available Exams');
  });

  it('should handle API errors gracefully', async () => {
    const mockClient = createMockClient({
      getProctorMetadata: vi.fn().mockRejectedValue(new Error('Invalid API key')),
    });

    const tool = getProctorMetadata(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error getting Proctor metadata');
    expect(result.content[0].text).toContain('Invalid API key');
  });

  it('should have correct tool metadata', () => {
    const mockClient = createMockClient();
    const tool = getProctorMetadata(mockServer, () => mockClient);

    expect(tool.name).toBe('get_proctor_metadata');
    expect(tool.description).toContain('runtimes');
    expect(tool.description).toContain('exams');
    expect(tool.inputSchema.type).toBe('object');
    expect(tool.inputSchema.properties).toEqual({});
    expect(tool.inputSchema.required).toEqual([]);
  });

  describe('tool group filtering', () => {
    it('should include get_proctor_metadata in proctor group', async () => {
      const server = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const registerTools = createRegisterTools(() => createMockClient(), 'proctor');
      registerTools(server);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (server as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      const names = result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('get_proctor_metadata');
      expect(names).toContain('run_exam_for_mirror');
      expect(names).toContain('get_exam_result');
      expect(names).toContain('save_results_for_mirror');
      expect(names).toContain('list_proctor_runs');
      expect(result.tools).toHaveLength(5);
    });

    it('should include get_proctor_metadata in proctor_readonly group', async () => {
      const server = new Server(
        { name: 'test', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      const registerTools = createRegisterTools(() => createMockClient(), 'proctor_readonly');
      registerTools(server);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handlers = (server as any)._requestHandlers;
      const listToolsHandler = handlers.get('tools/list');
      const result = await listToolsHandler({ method: 'tools/list', params: {} });

      const names = result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('get_proctor_metadata');
      expect(names).toContain('get_exam_result');
      expect(names).toContain('list_proctor_runs');
      // Write operations should be excluded
      expect(names).not.toContain('run_exam_for_mirror');
      expect(names).not.toContain('save_results_for_mirror');
      expect(result.tools).toHaveLength(3);
    });
  });
});
