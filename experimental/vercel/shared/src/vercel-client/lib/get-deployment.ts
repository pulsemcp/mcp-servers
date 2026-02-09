import type { VercelDeploymentDetail } from '../../types.js';

export async function getDeployment(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  idOrUrl: string
): Promise<VercelDeploymentDetail> {
  const params = new URLSearchParams();
  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v13/deployments/${encodeURIComponent(idOrUrl)}${queryString ? `?${queryString}` : ''}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get deployment: ${response.status} ${response.statusText} - ${body}`
    );
  }

  return response.json() as Promise<VercelDeploymentDetail>;
}
