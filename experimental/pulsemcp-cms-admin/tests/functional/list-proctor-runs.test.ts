import { describe, it, expect, vi } from 'vitest';
import { listProctorRuns } from '../../shared/src/tools/list-proctor-runs.js';
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
    ...overrides,
  };
}

describe('list_proctor_runs', () => {
  const mockServer = {} as Server;

  it('should fetch and format proctor runs with pagination', async () => {
    const mockClient = createMockClient({
      getProctorRuns: vi.fn().mockResolvedValue({
        runs: [
          {
            id: 123,
            slug: 'some-server',
            name: 'Some Server',
            recommended: true,
            mirrors_count: 2,
            tenant_count: 3,
            latest_version: '1.0.0',
            latest_mirror_id: 456,
            latest_mirror_name: 'mirror-name',
            latest_tested: true,
            last_auth_check_days: 2,
            last_tools_list_days: 3,
            auth_types: ['oauth2'],
            num_tools: 5,
            packages: ['npm'],
            remotes: ['streamable-http'],
            known_missing_init_tools_list: false,
            known_missing_auth_check: false,
            known_missing_init_tools_list_filter_to: null,
            known_missing_auth_check_filter_to: null,
          },
          {
            id: 789,
            slug: 'untested-server',
            name: null,
            recommended: false,
            mirrors_count: 1,
            tenant_count: 0,
            latest_version: null,
            latest_mirror_id: null,
            latest_mirror_name: null,
            latest_tested: false,
            last_auth_check_days: null,
            last_tools_list_days: null,
            auth_types: [],
            num_tools: null,
            packages: [],
            remotes: [],
            known_missing_init_tools_list: false,
            known_missing_auth_check: false,
            known_missing_init_tools_list_filter_to: null,
            known_missing_auth_check_filter_to: null,
          },
        ],
        pagination: {
          current_page: 1,
          total_pages: 2,
          total_count: 45,
          has_next: true,
          limit: 30,
        },
      }),
    });

    const tool = listProctorRuns(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Check header
    expect(text).toContain('Found 2 proctor run summaries');
    expect(text).toContain('page 1 of 2');
    expect(text).toContain('total: 45');

    // Check first run (fully populated)
    expect(text).toContain('**some-server**');
    expect(text).toContain('Some Server');
    expect(text).toContain('ID: 123');
    expect(text).toContain('Recommended: yes');
    expect(text).toContain('Mirrors: 2, Tenants: 3');
    expect(text).toContain('Latest Version: 1.0.0');
    expect(text).toContain('mirror: mirror-name, ID: 456');
    expect(text).toContain('Latest Tested: yes');
    expect(text).toContain('Last Auth Check: 2 day(s) ago');
    expect(text).toContain('Last Tools List: 3 day(s) ago');
    expect(text).toContain('Auth Types: oauth2');
    expect(text).toContain('Num Tools: 5');
    expect(text).toContain('Packages: npm');
    expect(text).toContain('Remotes: streamable-http');

    // Check second run (untested, sparse)
    expect(text).toContain('**untested-server**');
    expect(text).toContain('ID: 789');
    expect(text).toContain('Latest Tested: no');
    expect(text).toContain('Last Auth Check: never');
    expect(text).toContain('Last Tools List: never');

    // known_missing flags should NOT appear when false
    expect(text).not.toContain('Known Missing Init Tools List');
    expect(text).not.toContain('Known Missing Auth Check');
  });

  it('should render known_missing flags when true', async () => {
    const mockClient = createMockClient({
      getProctorRuns: vi.fn().mockResolvedValue({
        runs: [
          {
            id: 9719,
            slug: 'campfire',
            name: 'Campfire',
            recommended: true,
            mirrors_count: 1,
            tenant_count: 0,
            latest_version: null,
            latest_mirror_id: null,
            latest_mirror_name: null,
            latest_tested: false,
            last_auth_check_days: null,
            last_tools_list_days: null,
            auth_types: ['api_key'],
            num_tools: null,
            packages: [],
            remotes: ['streamable-http'],
            known_missing_init_tools_list: true,
            known_missing_auth_check: false,
            known_missing_init_tools_list_filter_to: null,
            known_missing_auth_check_filter_to: null,
          },
          {
            id: 9720,
            slug: 'cube',
            name: 'Cube',
            recommended: true,
            mirrors_count: 1,
            tenant_count: 0,
            latest_version: null,
            latest_mirror_id: null,
            latest_mirror_name: null,
            latest_tested: false,
            last_auth_check_days: null,
            last_tools_list_days: null,
            auth_types: ['oauth2'],
            num_tools: null,
            packages: [],
            remotes: ['streamable-http'],
            known_missing_init_tools_list: true,
            known_missing_auth_check: true,
            known_missing_init_tools_list_filter_to: null,
            known_missing_auth_check_filter_to: null,
          },
        ],
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 2,
          has_next: false,
          limit: 30,
        },
      }),
    });

    const tool = listProctorRuns(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Split output by server entry to verify per-server assertions
    const campfireSection = text.split('**cube**')[0];
    const cubeSection = text.split('**cube**')[1];

    // campfire: only known_missing_init_tools_list is true, no filter_to
    expect(campfireSection).toContain('**campfire**');
    expect(campfireSection).toContain('Known Missing Init Tools List: yes');
    expect(campfireSection).not.toContain('filter to:');
    expect(campfireSection).not.toContain('Known Missing Auth Check');

    // cube: both flags are true, no filter_to
    expect(cubeSection).toContain('Known Missing Init Tools List: yes');
    expect(cubeSection).toContain('Known Missing Auth Check: yes');
    expect(cubeSection).not.toContain('filter to:');
  });

  it('should render filter_to suffix when known_missing flags have filter values', async () => {
    const mockClient = createMockClient({
      getProctorRuns: vi.fn().mockResolvedValue({
        runs: [
          {
            id: 100,
            slug: 'filtered-both',
            name: 'Filtered Both',
            recommended: false,
            mirrors_count: 3,
            tenant_count: 1,
            latest_version: null,
            latest_mirror_id: null,
            latest_mirror_name: null,
            latest_tested: false,
            last_auth_check_days: null,
            last_tools_list_days: null,
            auth_types: [],
            num_tools: null,
            packages: [],
            remotes: ['streamable-http', 'sse'],
            known_missing_init_tools_list: true,
            known_missing_auth_check: true,
            known_missing_init_tools_list_filter_to: 'remotes[0]',
            known_missing_auth_check_filter_to: 'remotes[0],remotes[1]',
          },
          {
            id: 101,
            slug: 'filtered-one',
            name: 'Filtered One',
            recommended: false,
            mirrors_count: 2,
            tenant_count: 0,
            latest_version: null,
            latest_mirror_id: null,
            latest_mirror_name: null,
            latest_tested: false,
            last_auth_check_days: null,
            last_tools_list_days: null,
            auth_types: [],
            num_tools: null,
            packages: [],
            remotes: ['streamable-http'],
            known_missing_init_tools_list: true,
            known_missing_auth_check: false,
            known_missing_init_tools_list_filter_to: 'remotes[0]',
            known_missing_auth_check_filter_to: null,
          },
        ],
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 2,
          has_next: false,
          limit: 30,
        },
      }),
    });

    const tool = listProctorRuns(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBeFalsy();
    const text = result.content[0].text;

    // Split by second server entry
    const filteredBothSection = text.split('**filtered-one**')[0];
    const filteredOneSection = text.split('**filtered-one**')[1];

    // filtered-both: both flags with filter_to values
    expect(filteredBothSection).toContain(
      'Known Missing Init Tools List: yes (filter to: remotes[0])'
    );
    expect(filteredBothSection).toContain(
      'Known Missing Auth Check: yes (filter to: remotes[0],remotes[1])'
    );

    // filtered-one: only init_tools_list with filter_to
    expect(filteredOneSection).toContain(
      'Known Missing Init Tools List: yes (filter to: remotes[0])'
    );
    expect(filteredOneSection).not.toContain('Known Missing Auth Check');
  });

  it('should pass filter parameters to client', async () => {
    const getProctorRunsMock = vi.fn().mockResolvedValue({
      runs: [],
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_count: 0,
        has_next: false,
        limit: 10,
      },
    });

    const mockClient = createMockClient({
      getProctorRuns: getProctorRunsMock,
    });

    const tool = listProctorRuns(mockServer, () => mockClient);
    await tool.handler({
      q: 'test-server',
      recommended: true,
      tenant_ids: '1,2,3',
      sort: 'slug',
      direction: 'desc',
      limit: 10,
      offset: 20,
    });

    expect(getProctorRunsMock).toHaveBeenCalledWith({
      q: 'test-server',
      recommended: true,
      tenant_ids: '1,2,3',
      sort: 'slug',
      direction: 'desc',
      limit: 10,
      offset: 20,
    });
  });

  it('should handle API errors gracefully', async () => {
    const mockClient = createMockClient({
      getProctorRuns: vi.fn().mockRejectedValue(new Error('Invalid API key')),
    });

    const tool = listProctorRuns(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error fetching proctor runs');
    expect(result.content[0].text).toContain('Invalid API key');
  });

  it('should handle empty results', async () => {
    const mockClient = createMockClient({
      getProctorRuns: vi.fn().mockResolvedValue({
        runs: [],
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 0,
          has_next: false,
          limit: 30,
        },
      }),
    });

    const tool = listProctorRuns(mockServer, () => mockClient);
    const result = await tool.handler({});

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Found 0 proctor run summaries');
  });

  it('should have correct tool metadata', () => {
    const mockClient = createMockClient();
    const tool = listProctorRuns(mockServer, () => mockClient);

    expect(tool.name).toBe('list_proctor_runs');
    expect(tool.description).toContain('proctor run summaries');
    expect(tool.inputSchema.properties).toHaveProperty('q');
    expect(tool.inputSchema.properties).toHaveProperty('recommended');
    expect(tool.inputSchema.properties).toHaveProperty('tenant_ids');
    expect(tool.inputSchema.properties).toHaveProperty('sort');
    expect(tool.inputSchema.properties.sort.enum).toEqual([
      'slug',
      'name',
      'mirrors',
      'recommended',
      'tenants',
      'latest_tested',
      'last_auth_check',
      'last_tools_list',
    ]);
    expect(tool.inputSchema.properties).toHaveProperty('direction');
    expect(tool.inputSchema.properties).toHaveProperty('limit');
    expect(tool.inputSchema.properties).toHaveProperty('offset');
  });

  describe('tool group filtering for proctor', () => {
    it('should include list_proctor_runs in proctor group', async () => {
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
      expect(names).toContain('list_proctor_runs');
      expect(names).toContain('run_exam_for_mirror');
      expect(names).toContain('get_exam_result');
      expect(names).toContain('save_results_for_mirror');
      expect(names).toContain('get_proctor_metadata');
      expect(result.tools).toHaveLength(5);
    });

    it('should include list_proctor_runs in proctor_readonly group', async () => {
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
      expect(names).toContain('list_proctor_runs');
      expect(names).toContain('get_exam_result');
      expect(names).toContain('get_proctor_metadata');
      // Write operations should be excluded
      expect(names).not.toContain('run_exam_for_mirror');
      expect(names).not.toContain('save_results_for_mirror');
      expect(result.tools).toHaveLength(3);
    });

    it('should include proctor in default groups', () => {
      const groups = parseEnabledToolGroups();
      expect(groups).toContain('proctor');
    });
  });
});
