import type { RuntimeLogEntry } from '../../types.js';
import { logWarning } from '../../logging.js';

export async function getRuntimeLogs(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  projectId: string,
  deploymentId: string
): Promise<RuntimeLogEntry[]> {
  const params = new URLSearchParams();
  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v1/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/runtime-logs${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      ...headers,
      Accept: 'application/stream+json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get runtime logs: ${response.status} ${response.statusText} - ${body}`
    );
  }

  // Runtime logs endpoint returns newline-delimited JSON (application/stream+json)
  // We parse each line as a JSON object
  const text = await response.text();
  const lines = text.split('\n').filter((line) => line.trim());

  const entries: RuntimeLogEntry[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as RuntimeLogEntry;
      entries.push(entry);
    } catch {
      logWarning(
        'getRuntimeLogs',
        `Skipping malformed runtime log line: ${line.substring(0, 100)}`
      );
    }
  }

  return entries;
}
