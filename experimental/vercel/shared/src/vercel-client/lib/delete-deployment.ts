export interface DeleteDeploymentResponse {
  uid: string;
  state: string;
}

export async function deleteDeployment(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  deploymentId: string
): Promise<DeleteDeploymentResponse> {
  const params = new URLSearchParams();
  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v13/deployments/${encodeURIComponent(deploymentId)}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to delete deployment: ${response.status} ${response.statusText} - ${body}`
    );
  }

  return response.json() as Promise<DeleteDeploymentResponse>;
}
