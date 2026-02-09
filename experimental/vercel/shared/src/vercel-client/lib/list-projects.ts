import type { VercelProject } from '../../types.js';

export interface ListProjectsResponse {
  projects: VercelProject[];
  pagination: {
    count: number;
    next: number | null;
    prev: number | null;
  };
}

export interface ListProjectsOptions {
  limit?: number;
  since?: number;
  until?: number;
  search?: string;
}

export async function listProjects(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  options: ListProjectsOptions = {}
): Promise<ListProjectsResponse> {
  const params = new URLSearchParams();

  if (options.limit) params.set('limit', options.limit.toString());
  if (options.since) params.set('since', options.since.toString());
  if (options.until) params.set('until', options.until.toString());
  if (options.search) params.set('search', options.search);

  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v9/projects${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to list projects: ${response.status} ${response.statusText} - ${body}`);
  }

  return response.json() as Promise<ListProjectsResponse>;
}
