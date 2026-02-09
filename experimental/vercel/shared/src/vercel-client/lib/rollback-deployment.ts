export async function rollbackDeployment(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  projectId: string,
  deploymentId: string,
  description?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v9/projects/${encodeURIComponent(projectId)}/rollback/${encodeURIComponent(deploymentId)}${queryString ? `?${queryString}` : ''}`;

  const body: Record<string, unknown> = {};
  if (description) body.description = description;

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Failed to rollback deployment: ${response.status} ${response.statusText} - ${responseBody}`
    );
  }
}
