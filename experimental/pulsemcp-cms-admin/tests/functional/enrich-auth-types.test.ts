import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProctorRuns } from '../../shared/src/pulsemcp-admin-client/lib/get-proctor-runs.js';

// Mock the getUnifiedMCPServer dependency
vi.mock('../../shared/src/pulsemcp-admin-client/lib/get-unified-mcp-server.js', () => ({
  getUnifiedMCPServer: vi.fn(),
}));

import { getUnifiedMCPServer } from '../../shared/src/pulsemcp-admin-client/lib/get-unified-mcp-server.js';

const mockedGetUnifiedMCPServer = vi.mocked(getUnifiedMCPServer);

function createMockRailsResponse(
  runs: Array<{
    slug: string;
    auth_types: string[];
  }>
) {
  return {
    data: runs.map((run, index) => ({
      id: index + 1,
      slug: run.slug,
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
      auth_types: run.auth_types,
      num_tools: null,
      packages: [],
      remotes: [],
      known_missing_init_tools_list: false,
      known_missing_auth_check: false,
    })),
    meta: {
      current_page: 1,
      total_pages: 1,
      total_count: runs.length,
      has_next: false,
      limit: 30,
    },
  };
}

describe('getProctorRuns enrich_auth_types', () => {
  const apiKey = 'test-api-key';
  const baseUrl = 'https://admin.test.example.com';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not enrich auth_types when enrich_auth_types is not set', async () => {
    const mockResponse = createMockRailsResponse([{ slug: 'huggingface', auth_types: ['open'] }]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await getProctorRuns(apiKey, baseUrl);

    expect(result.runs[0].auth_types).toEqual(['open']);
    expect(mockedGetUnifiedMCPServer).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  it('should enrich auth_types from server remotes when enrich_auth_types is true', async () => {
    const mockResponse = createMockRailsResponse([{ slug: 'huggingface', auth_types: ['open'] }]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    mockedGetUnifiedMCPServer.mockResolvedValueOnce({
      id: 5017,
      slug: 'huggingface',
      implementation_id: 100,
      name: 'Hugging Face',
      status: 'live',
      remotes: [
        { id: 1, authentication_method: 'oauth', transport: 'streamable_http' },
        { id: 2, authentication_method: 'api_key', transport: 'streamable_http' },
        { id: 3, authentication_method: 'open', transport: 'streamable_http' },
      ],
    });

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['api_key', 'oauth', 'open']);
    expect(mockedGetUnifiedMCPServer).toHaveBeenCalledWith(apiKey, baseUrl, 'huggingface');

    fetchMock.mockRestore();
  });

  it('should deduplicate auth_types from remotes', async () => {
    const mockResponse = createMockRailsResponse([
      { slug: 'test-server', auth_types: ['api_key'] },
    ]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    mockedGetUnifiedMCPServer.mockResolvedValueOnce({
      id: 1,
      slug: 'test-server',
      implementation_id: 1,
      name: 'Test',
      status: 'live',
      remotes: [
        { id: 1, authentication_method: 'api_key', transport: 'streamable_http' },
        { id: 2, authentication_method: 'api_key', transport: 'sse' },
        { id: 3, authentication_method: 'oauth', transport: 'streamable_http' },
      ],
    });

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    // Should be deduplicated and sorted
    expect(result.runs[0].auth_types).toEqual(['api_key', 'oauth']);

    fetchMock.mockRestore();
  });

  it('should fall back to original auth_types when server lookup fails', async () => {
    const mockResponse = createMockRailsResponse([
      { slug: 'failing-server', auth_types: ['open'] },
    ]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    mockedGetUnifiedMCPServer.mockRejectedValueOnce(new Error('Server not found'));

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    // Falls back to original auth_types
    expect(result.runs[0].auth_types).toEqual(['open']);

    fetchMock.mockRestore();
  });

  it('should fall back to original auth_types when server has no remotes', async () => {
    const mockResponse = createMockRailsResponse([{ slug: 'no-remotes', auth_types: ['api_key'] }]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    mockedGetUnifiedMCPServer.mockResolvedValueOnce({
      id: 1,
      slug: 'no-remotes',
      implementation_id: 1,
      name: 'No Remotes',
      status: 'live',
      remotes: [],
    });

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    // Falls back to original auth_types when no remotes
    expect(result.runs[0].auth_types).toEqual(['api_key']);

    fetchMock.mockRestore();
  });

  it('should enrich auth_types for multiple servers in parallel', async () => {
    const mockResponse = createMockRailsResponse([
      { slug: 'server-a', auth_types: ['open'] },
      { slug: 'server-b', auth_types: ['api_key'] },
    ]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    mockedGetUnifiedMCPServer
      .mockResolvedValueOnce({
        id: 1,
        slug: 'server-a',
        implementation_id: 1,
        name: 'Server A',
        status: 'live',
        remotes: [
          { id: 1, authentication_method: 'open', transport: 'streamable_http' },
          { id: 2, authentication_method: 'oauth', transport: 'streamable_http' },
        ],
      })
      .mockResolvedValueOnce({
        id: 2,
        slug: 'server-b',
        implementation_id: 2,
        name: 'Server B',
        status: 'live',
        remotes: [
          { id: 3, authentication_method: 'api_key', transport: 'streamable_http' },
          { id: 4, authentication_method: 'oauth', transport: 'sse' },
        ],
      });

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['oauth', 'open']);
    expect(result.runs[1].auth_types).toEqual(['api_key', 'oauth']);
    expect(mockedGetUnifiedMCPServer).toHaveBeenCalledTimes(2);

    fetchMock.mockRestore();
  });

  it('should skip remotes with no authentication_method', async () => {
    const mockResponse = createMockRailsResponse([{ slug: 'partial-auth', auth_types: ['open'] }]);

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    mockedGetUnifiedMCPServer.mockResolvedValueOnce({
      id: 1,
      slug: 'partial-auth',
      implementation_id: 1,
      name: 'Partial Auth',
      status: 'live',
      remotes: [
        { id: 1, authentication_method: 'oauth', transport: 'streamable_http' },
        { id: 2, transport: 'sse' }, // No authentication_method
        { id: 3, authentication_method: undefined, transport: 'streamable_http' },
      ],
    });

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['oauth']);

    fetchMock.mockRestore();
  });
});
