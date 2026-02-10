import type { VercelDeploymentDetail } from '../../types.js';

export interface CreateDeploymentOptions {
  name: string;
  target?: string;
  gitSource?: {
    type: string;
    ref: string;
    repoId: string;
  };
  projectSettings?: {
    framework?: string;
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
    nodeVersion?: string;
  };
  deploymentId?: string;
  meta?: Record<string, string>;
}

export async function createDeployment(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  options: CreateDeploymentOptions
): Promise<VercelDeploymentDetail> {
  const params = new URLSearchParams();
  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v13/deployments${queryString ? `?${queryString}` : ''}`;

  const body: Record<string, unknown> = {
    name: options.name,
  };

  if (options.target) body.target = options.target;
  if (options.gitSource) body.gitSource = options.gitSource;
  if (options.projectSettings) body.projectSettings = options.projectSettings;
  if (options.deploymentId) body.deploymentId = options.deploymentId;
  if (options.meta) body.meta = options.meta;

  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `Failed to create deployment: ${response.status} ${response.statusText} - ${responseBody}`
    );
  }

  return response.json() as Promise<VercelDeploymentDetail>;
}
