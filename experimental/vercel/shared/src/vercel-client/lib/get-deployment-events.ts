import type { DeploymentEvent } from '../../types.js';

export interface GetDeploymentEventsOptions {
  direction?: 'forward' | 'backward';
  limit?: number;
  name?: string;
  since?: number;
  until?: number;
}

export async function getDeploymentEvents(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  idOrUrl: string,
  options: GetDeploymentEventsOptions = {}
): Promise<DeploymentEvent[]> {
  const params = new URLSearchParams();

  if (options.direction !== undefined) params.set('direction', options.direction);
  if (options.limit !== undefined) params.set('limit', options.limit.toString());
  if (options.name !== undefined) params.set('name', options.name);
  if (options.since !== undefined) params.set('since', options.since.toString());
  if (options.until !== undefined) params.set('until', options.until.toString());

  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v3/deployments/${encodeURIComponent(idOrUrl)}/events${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      ...headers,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get deployment events: ${response.status} ${response.statusText} - ${body}`
    );
  }

  return response.json() as Promise<DeploymentEvent[]>;
}
