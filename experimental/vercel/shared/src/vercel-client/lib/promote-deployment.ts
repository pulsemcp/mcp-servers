export async function promoteDeployment(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  projectId: string,
  deploymentId: string
): Promise<void> {
  const params = new URLSearchParams();
  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deploymentId)}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to promote deployment: ${response.status} ${response.statusText} - ${body}`
    );
  }
}
