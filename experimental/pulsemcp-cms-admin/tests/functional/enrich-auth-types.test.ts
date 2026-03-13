import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProctorRuns } from '../../shared/src/pulsemcp-admin-client/lib/get-proctor-runs.js';

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

function createMockImplSearchResponse(remotes: Array<{ authentication_method?: string }>) {
  return {
    data: [
      {
        mcp_server_id: 1,
        mcp_server: { remotes },
      },
    ],
  };
}

describe('getProctorRuns enrich_auth_types', () => {
  const apiKey = 'test-api-key';
  const baseUrl = 'https://admin.test.example.com';
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    if (fetchMock) fetchMock.mockRestore();
    vi.restoreAllMocks();
  });

  it('should not enrich auth_types when enrich_auth_types is not set', async () => {
    const mockResponse = createMockRailsResponse([{ slug: 'huggingface', auth_types: ['open'] }]);

    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await getProctorRuns(apiKey, baseUrl);

    expect(result.runs[0].auth_types).toEqual(['open']);
    // Only the initial proctor_runs fetch, no enrichment calls
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should not enrich auth_types when enrich_auth_types is explicitly false', async () => {
    const mockResponse = createMockRailsResponse([{ slug: 'huggingface', auth_types: ['open'] }]);

    fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: false });

    expect(result.runs[0].auth_types).toEqual(['open']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should enrich auth_types from server remotes when enrich_auth_types is true', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'huggingface', auth_types: ['open'] },
    ]);
    const implResponse = createMockImplSearchResponse([
      { authentication_method: 'oauth' },
      { authentication_method: 'api_key' },
      { authentication_method: 'open' },
    ]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => implResponse } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['api_key', 'oauth', 'open']);
    // 1 proctor_runs call + 1 implementations/search call
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate auth_types from remotes', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'test-server', auth_types: ['api_key'] },
    ]);
    const implResponse = createMockImplSearchResponse([
      { authentication_method: 'api_key' },
      { authentication_method: 'api_key' },
      { authentication_method: 'oauth' },
    ]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => implResponse } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['api_key', 'oauth']);
  });

  it('should fall back to original auth_types when enrichment fetch fails', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'failing-server', auth_types: ['open'] },
    ]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockRejectedValueOnce(new Error('Network error'));

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['open']);
  });

  it('should fall back to original auth_types when enrichment returns non-ok', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'not-found', auth_types: ['api_key'] },
    ]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockResolvedValueOnce({ ok: false, status: 404 } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['api_key']);
  });

  it('should fall back to original auth_types when server has no remotes', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'no-remotes', auth_types: ['api_key'] },
    ]);
    const implResponse = createMockImplSearchResponse([]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => implResponse } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['api_key']);
  });

  it('should fall back when all remotes have null/undefined authentication_method', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'no-auth-methods', auth_types: ['open'] },
    ]);
    const implResponse = createMockImplSearchResponse([{ authentication_method: undefined }, {}]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => implResponse } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['open']);
  });

  it('should enrich auth_types for multiple servers with concurrency', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'server-a', auth_types: ['open'] },
      { slug: 'server-b', auth_types: ['api_key'] },
    ]);
    const implResponseA = createMockImplSearchResponse([
      { authentication_method: 'open' },
      { authentication_method: 'oauth' },
    ]);
    const implResponseB = createMockImplSearchResponse([
      { authentication_method: 'api_key' },
      { authentication_method: 'oauth' },
    ]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => implResponseA } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => implResponseB } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['oauth', 'open']);
    expect(result.runs[1].auth_types).toEqual(['api_key', 'oauth']);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should skip remotes with no authentication_method', async () => {
    const proctorResponse = createMockRailsResponse([
      { slug: 'partial-auth', auth_types: ['open'] },
    ]);
    const implResponse = createMockImplSearchResponse([
      { authentication_method: 'oauth' },
      {}, // No authentication_method
      { authentication_method: undefined },
    ]);

    fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => proctorResponse } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => implResponse } as Response);

    const result = await getProctorRuns(apiKey, baseUrl, { enrich_auth_types: true });

    expect(result.runs[0].auth_types).toEqual(['oauth']);
  });
});
