import type { GetProctorRunsParams, ProctorRunsResponse } from '../../types.js';

interface RailsProctorRun {
  id: number;
  slug: string;
  name: string | null;
  recommended: boolean;
  mirrors_count: number;
  tenant_count: number;
  latest_version: string | null;
  latest_mirror_id: number | null;
  latest_mirror_name: string | null;
  latest_tested: boolean;
  last_auth_check_days: number | null;
  last_tools_list_days: number | null;
  auth_types: string[];
  num_tools: number | null;
  packages: string[];
  remotes: string[];
  known_missing_init_tools_list: boolean;
  known_missing_auth_check: boolean;
}

interface RailsResponse {
  data: RailsProctorRun[];
  meta: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    limit: number;
  };
}

interface RailsImplementationWithRemotes {
  mcp_server_id?: number | null;
  mcp_server?: {
    remotes?: Array<{ authentication_method?: string }>;
  } | null;
}

const ENRICHMENT_CONCURRENCY = 5;

/**
 * Fetch a server's remote authentication methods via the implementations search endpoint.
 * Uses a single API call (lighter than getUnifiedMCPServer which makes 2 calls).
 */
async function fetchRemoteAuthMethods(
  apiKey: string,
  baseUrl: string,
  slug: string
): Promise<string[]> {
  const searchUrl = new URL('/api/implementations/search', baseUrl);
  searchUrl.searchParams.append('q', slug);
  searchUrl.searchParams.append('type', 'server');
  searchUrl.searchParams.append('limit', '50');

  const response = await fetch(searchUrl.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { data: RailsImplementationWithRemotes[] };

  // Find the implementation whose mcp_server slug matches exactly
  for (const impl of data.data) {
    const remotes = impl.mcp_server?.remotes;
    if (remotes && remotes.length > 0) {
      const authMethods = remotes
        .map((r) => r.authentication_method)
        .filter((method): method is string => !!method);
      const unique = [...new Set(authMethods)];
      if (unique.length > 0) {
        return unique.sort();
      }
    }
  }

  return [];
}

/**
 * Derive auth_types from a server's remotes by extracting unique authentication_method values.
 * Falls back to the original auth_types if the server lookup fails or returns no remotes.
 */
async function enrichAuthTypes(
  apiKey: string,
  baseUrl: string,
  slug: string,
  fallbackAuthTypes: string[]
): Promise<string[]> {
  try {
    const authMethods = await fetchRemoteAuthMethods(apiKey, baseUrl, slug);
    if (authMethods.length > 0) {
      return authMethods;
    }
  } catch {
    // Fall through to return original auth_types
  }
  return fallbackAuthTypes;
}

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++;
      results[index] = await tasks[index]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => runNext());
  await Promise.all(workers);
  return results;
}

export async function getProctorRuns(
  apiKey: string,
  baseUrl: string,
  params?: GetProctorRunsParams
): Promise<ProctorRunsResponse> {
  const url = new URL('/api/proctor_runs', baseUrl);

  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.recommended) {
    url.searchParams.append('recommended', '1');
  }
  if (params?.tenant_ids) {
    url.searchParams.append('tenant_ids', params.tenant_ids);
  }
  if (params?.sort) {
    url.searchParams.append('sort', params.sort);
  }
  if (params?.direction) {
    url.searchParams.append('direction', params.direction);
  }
  if (params?.limit) {
    url.searchParams.append('limit', params.limit.toString());
  }
  if (params?.offset !== undefined && params.offset > 0) {
    url.searchParams.append('offset', params.offset.toString());
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    throw new Error(`Failed to fetch proctor runs: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as RailsResponse;

  let runs = data.data.map((run) => ({
    id: run.id,
    slug: run.slug,
    name: run.name,
    recommended: run.recommended,
    mirrors_count: run.mirrors_count,
    tenant_count: run.tenant_count,
    latest_version: run.latest_version,
    latest_mirror_id: run.latest_mirror_id,
    latest_mirror_name: run.latest_mirror_name,
    latest_tested: run.latest_tested,
    last_auth_check_days: run.last_auth_check_days,
    last_tools_list_days: run.last_tools_list_days,
    auth_types: run.auth_types,
    num_tools: run.num_tools,
    packages: run.packages,
    remotes: run.remotes,
    known_missing_init_tools_list: run.known_missing_init_tools_list || false,
    known_missing_auth_check: run.known_missing_auth_check || false,
  }));

  // Enrich auth_types by fetching each server's remotes and deriving auth types
  // from their authentication_method fields. Uses concurrency limit to avoid
  // hammering the API with too many parallel requests.
  if (params?.enrich_auth_types) {
    const enrichedAuthTypes = await runWithConcurrency(
      runs.map((run) => () => enrichAuthTypes(apiKey, baseUrl, run.slug, run.auth_types)),
      ENRICHMENT_CONCURRENCY
    );
    runs = runs.map((run, i) => ({ ...run, auth_types: enrichedAuthTypes[i] }));
  }

  return {
    runs,
    pagination: {
      current_page: data.meta.current_page,
      total_pages: data.meta.total_pages,
      total_count: data.meta.total_count,
      has_next: data.meta.has_next,
      limit: data.meta.limit,
    },
  };
}
