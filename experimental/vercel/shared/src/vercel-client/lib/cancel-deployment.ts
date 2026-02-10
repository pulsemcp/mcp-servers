import type { VercelDeploymentDetail } from '../../types.js';

export async function cancelDeployment(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  deploymentId: string
): Promise<VercelDeploymentDetail> {
  const params = new URLSearchParams();
  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v12/deployments/${encodeURIComponent(deploymentId)}/cancel${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to cancel deployment: ${response.status} ${response.statusText} - ${body}`
    );
  }

  return response.json() as Promise<VercelDeploymentDetail>;
}
