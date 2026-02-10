import type { ListDeploymentsResponse } from '../../types.js';

export interface ListDeploymentsOptions {
  app?: string;
  projectId?: string;
  limit?: number;
  target?: string;
  state?: string;
  since?: number;
  until?: number;
}

export async function listDeployments(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  options: ListDeploymentsOptions = {}
): Promise<ListDeploymentsResponse> {
  const params = new URLSearchParams();

  if (options.app !== undefined) params.set('app', options.app);
  if (options.projectId !== undefined) params.set('projectId', options.projectId);
  if (options.limit !== undefined) params.set('limit', options.limit.toString());
  if (options.target !== undefined) params.set('target', options.target);
  if (options.state !== undefined) params.set('state', options.state);
  if (options.since !== undefined) params.set('since', options.since.toString());
  if (options.until !== undefined) params.set('until', options.until.toString());

  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const url = `${baseUrl}/v6/deployments?${params.toString()}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to list deployments: ${response.status} ${response.statusText} - ${body}`
    );
  }

  return response.json() as Promise<ListDeploymentsResponse>;
}
